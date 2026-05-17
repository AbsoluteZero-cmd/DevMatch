"""
AI Service — DevMatch
Handles LLM-based profile analysis: assigns Skill Scores across 10 roles
and suggests skill tags. Called on profile creation and on every profile update.
"""

import json
import logging
import time
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.profile import (
    Profile,
    ProfileRole,
    ProfileSkillTag,
    Role,
    SkillLevel,
    SkillTag,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SKILL_LEVEL_MAP = {
    (0, 24): SkillLevel.BEGINNER,
    (25, 49): SkillLevel.INTERMEDIATE,
    (50, 74): SkillLevel.ADVANCED,
    (75, 100): SkillLevel.EXPERT,
}

ROLE_NAMES = [
    "Frontend Engineer",
    "Backend Engineer",
    "Full-Stack Engineer",
    "Mobile Engineer (iOS / Android)",
    "DevOps / Infrastructure Engineer",
    "Data Engineer",
    "ML / AI Engineer",
    "Data Scientist",
    "Security Engineer",
    "QA Engineer",
]

MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 2  # seconds


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _score_to_level(score: int) -> SkillLevel:
    for (low, high), level in SKILL_LEVEL_MAP.items():
        if low <= score <= high:
            return level
    return SkillLevel.BEGINNER


def _build_prompt(profile: Profile) -> str:
    """
    Serialise the developer profile into a structured prompt for the LLM.
    All LLM calls are server-side — no API key is ever sent to the client.
    """
    # --- education ---
    education_lines = []
    for e in profile.education_entries:
        parts = [e.degree.value, "at", e.institution_name]
        if e.major:
            parts += ["—", e.major]
        if e.graduation_year:
            parts += [f"({e.graduation_year})"]
        education_lines.append(" ".join(parts))

    # --- project history ---
    project_lines = []
    for p in profile.project_history_entries:
        line = f"- {p.project_name}"
        if p.role:
            line += f" | Role: {p.role}"
        if p.technologies_used:
            line += f" | Tech: {p.technologies_used}"
        if p.description:
            line += f" | {p.description[:300]}"
        project_lines.append(line)

    # --- external links ---
    link_lines = [u.url_str for u in profile.external_urls]

    # --- skill tags ---
    tag_lines = [pt.skill_tag.name for pt in profile.profile_skill_tags]

    prompt = f"""You are an expert technical recruiter and software engineering assessor.

Analyse the developer profile below and return a JSON object with EXACTLY this structure
(no markdown, no extra keys, no explanation — raw JSON only):

{{
  "skill_scores": {{
    "Frontend Engineer": <integer 0-100>,
    "Backend Engineer": <integer 0-100>,
    "Full-Stack Engineer": <integer 0-100>,
    "Mobile Engineer (iOS / Android)": <integer 0-100>,
    "DevOps / Infrastructure Engineer": <integer 0-100>,
    "Data Engineer": <integer 0-100>,
    "ML / AI Engineer": <integer 0-100>,
    "Data Scientist": <integer 0-100>,
    "Security Engineer": <integer 0-100>,
    "QA Engineer": <integer 0-100>
  }},
  "suggested_tags": [<list of 3-8 concise skill/technology tag strings>]
}}

Scoring guidelines:
- 0–24  Beginner: little to no evidence of this role
- 25–49 Intermediate: some relevant experience
- 50–74 Advanced: solid, recurring evidence
- 75–100 Expert: deep, dominant expertise

Developer Profile:
- Name: {profile.full_name or "N/A"}
- Years of experience: {profile.years_experience or "N/A"}
- Education: {"; ".join(education_lines) or "N/A"}
- External links: {", ".join(link_lines) or "N/A"}
- Self-declared skill tags: {", ".join(tag_lines) or "N/A"}

Project History:
{chr(10).join(project_lines) or "No projects listed."}

Return ONLY the JSON object. No markdown fences.
"""
    return prompt


def _call_llm(prompt: str) -> dict:
    """
    Send the prompt to the Groq API (llama-3.3-70b — free tier, ~14400 req/day)
    with retry + exponential backoff.
    Raises RuntimeError if all retries fail.

    Get a free API key at: https://groq.com
    Set GROQ_API_KEY in backend/.env
    """
    api_key = getattr(settings, "GROQ_API_KEY", None)
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not set in backend/.env")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
        "max_tokens": 1024,
    }

    last_error: Optional[Exception] = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            with httpx.Client(timeout=30) as client:
                resp = client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers=headers,
                    json=payload,
                )
                resp.raise_for_status()
                data = resp.json()
                text = data["choices"][0]["message"]["content"].strip()
                # Strip accidental markdown fences just in case
                if text.startswith("```"):
                    text = text.split("```")[1]
                    if text.startswith("json"):
                        text = text[4:]
                return json.loads(text)
        except Exception as exc:
            last_error = exc
            wait = RETRY_BACKOFF_BASE ** attempt
            logger.warning(
                "Groq API attempt %d/%d failed: %s. Retrying in %ds…",
                attempt, MAX_RETRIES, exc, wait,
            )
            time.sleep(wait)

    raise RuntimeError(
        f"Groq API failed after {MAX_RETRIES} attempts: {last_error}"
    )


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

def analyse_profile(profile_id: str, db: Session) -> None:
    """
    Run AI analysis for a developer profile:
      1. Build prompt from profile data
      2. Call LLM API (with retries)
      3. Upsert ProfileRole rows (skill_score + skill_level)
      4. Add AI-generated skill tags (skip duplicates)
      5. Stamp profile.last_ai_analysis

    Raises RuntimeError if the LLM call ultimately fails so the caller
    can queue a background retry and notify the user (FR-08, NFR-08).
    """
    from datetime import datetime, timezone

    # Load profile with all relationships
    profile = (
        db.query(Profile)
        .filter(Profile.id == profile_id)
        .first()
    )
    if not profile:
        raise ValueError(f"Profile {profile_id} not found")

    # Load all Role rows so we can look them up by name
    all_roles = {r.name: r for r in db.query(Role).all()}

    # Build prompt and call LLM
    prompt = _build_prompt(profile)
    logger.info("Running AI analysis for profile %s", profile_id)
    result = _call_llm(prompt)

    # --- Upsert ProfileRole rows ---
    skill_scores: dict = result.get("skill_scores", {})
    for role_name, score in skill_scores.items():
        role = all_roles.get(role_name)
        if not role:
            logger.warning("Unknown role name from LLM: %s — skipping", role_name)
            continue

        # Clamp score to 0-100
        score = max(0, min(100, int(score)))
        level = _score_to_level(score)

        existing = (
            db.query(ProfileRole)
            .filter(
                ProfileRole.profile_id == profile.id,
                ProfileRole.role_id == role.id,
            )
            .first()
        )
        if existing:
            existing.skill_score = score
            existing.skill_level = level
        else:
            db.add(
                ProfileRole(
                    profile_id=profile.id,
                    role_id=role.id,
                    skill_score=score,
                    skill_level=level,
                )
            )

    # --- Upsert AI-suggested skill tags ---
    suggested_tags: list = result.get("suggested_tags", [])
    existing_tag_names = {
        pt.skill_tag.name
        for pt in profile.profile_skill_tags
    }

    for tag_name in suggested_tags:
        tag_name = tag_name.strip()
        if not tag_name or tag_name in existing_tag_names:
            continue

        # Get or create the SkillTag row
        tag = db.query(SkillTag).filter(SkillTag.name == tag_name).first()
        if not tag:
            tag = SkillTag(name=tag_name)
            db.add(tag)
            db.flush()  # get tag.id

        from app.models.profile import ProfileSkillTag
        db.add(
            ProfileSkillTag(
                profile_id=profile.id,
                tag_id=tag.id,
                is_ai_generated=True,
            )
        )
        existing_tag_names.add(tag_name)

    # --- Stamp last analysis time ---
    profile.last_ai_analysis = datetime.now(timezone.utc)

    db.commit()
    logger.info("AI analysis complete for profile %s", profile_id)
