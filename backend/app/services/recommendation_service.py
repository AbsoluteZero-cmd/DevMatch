"""
Recommendation Service — DevMatch
Implements FR-45 to FR-49: AI candidate recommendation for job postings.

Match Score formula (FR-46):
  score = 0.6 * role_score
        + 0.25 * gap_score
        + 0.15 * seniority_score

  role_score    : developer's raw Skill Score (0-100) for the required role
  gap_score     : how much the developer fills the team's weakest area in that role
  seniority_score: alignment between developer seniority and team average seniority
"""

import logging
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session, selectinload

from app.models.profile import Profile, ProfileRole, SkillLevel
from app.models.team import (
    CandidateRecommendation,
    JobPosting,
    Team,
    TeamMember,
    JobPostingStatus,
)

logger = logging.getLogger(__name__)

# Weights for match score components (FR-46)
W_ROLE = 0.60
W_GAP = 0.25
W_SENIORITY = 0.15

SKILL_LEVEL_ORDER = {
    SkillLevel.BEGINNER: 0,
    SkillLevel.INTERMEDIATE: 1,
    SkillLevel.ADVANCED: 2,
    SkillLevel.EXPERT: 3,
}

LEVEL_TO_MIN_SCORE = {
    "Beginner": 0,
    "Intermediate": 25,
    "Advanced": 50,
    "Expert": 75,
}


LEVEL_TO_MAX_SCORE = {
    "Beginner": 24,
    "Intermediate": 49,
    "Advanced": 74,
    "Expert": 100,
}


def skill_label_to_avg_score(label: str) -> int:
    """Convert a skill-level label to the rounded-up average numeric score for that band."""
    if label not in LEVEL_TO_MIN_SCORE:
        # default to Intermediate mid-point
        label = "Intermediate"
    lo = LEVEL_TO_MIN_SCORE[label]
    hi = LEVEL_TO_MAX_SCORE[label]
    avg = (lo + hi) / 2.0
    return int(avg) if avg == int(avg) else int(avg + 0.9999)


def _get_role_score(profile: Profile, role_name: str) -> int:
    """Return developer's Skill Score for the given role, or 0 if not assessed."""
    for pr in profile.profile_roles:
        if pr.role.name == role_name:
            return pr.skill_score
    return 0


def _get_team_avg_score_for_role(team: Team, role_name: str, db: Session) -> float:
    """
    Compute the team's average Skill Score for a role across registered members (FR-40).
    Unregistered members contribute at 50% weight (FR-38).
    Returns 0.0 if team has no members with that role.
    """
    total_weighted = 0.0
    total_weight = 0.0

    for member in team.members:
        if member.is_registered and member.user_id:
            profile = (
                db.query(Profile)
                .options(
                    selectinload(Profile.profile_roles).selectinload(ProfileRole.role)
                )
                .filter(Profile.user_id == member.user_id)
                .first()
            )
            if profile:
                score = _get_role_score(profile, role_name)
                total_weighted += score * 1.0
                total_weight += 1.0
        else:
            # Unregistered members: weighted at 50% (FR-38)
            # If the team member declared a skill score, prefer that; otherwise assume neutral 25
            declared = getattr(member, "unregistered_skill_score", None)
            if declared is not None:
                total_weighted += declared * 0.5
            else:
                total_weighted += 25 * 0.5  # assume mid-level if unknown
            total_weight += 0.5

    return (total_weighted / total_weight) if total_weight > 0 else 0.0


def refresh_recommendations_for_team(team_id: str, db: Session) -> list[dict]:
    """Refresh recommendations for all OPEN postings belonging to a team.

    This provides a common trigger to call when team composition or posting
    requirements change (FR-48).
    """
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        return []
    results = []
    for posting in team.job_postings:
        if posting.status == JobPostingStatus.OPEN:
            try:
                res = generate_recommendations(str(posting.id), db)
                results.extend(res)
            except Exception:
                logger.exception(
                    "Failed to refresh recommendations for posting %s", posting.id
                )
    return results


def _get_team_avg_seniority(team: Team, db: Session) -> float:
    """
    Compute team's average years_experience as a proxy for seniority (0-1 normalized).
    Caps at 10 years. Unregistered members assumed 2 years.
    """
    total = 0.0
    count = 0

    for member in team.members:
        if member.is_registered and member.user_id:
            profile = (
                db.query(Profile).filter(Profile.user_id == member.user_id).first()
            )
            years = (profile.years_experience or 2) if profile else 2
        else:
            years = 2  # assume junior for unregistered
        total += min(years, 10) / 10.0
        count += 1

    return (total / count) if count > 0 else 0.3


def _get_member_assigned_role_score(member: TeamMember, db: Session) -> Optional[int]:
    """Return the score for the member's assigned role, or None if unavailable."""
    assigned_role = getattr(member, "assigned_role", None)
    if not assigned_role:
        return None

    if member.is_registered and member.user_id:
        profile = (
            db.query(Profile)
            .options(selectinload(Profile.profile_roles).selectinload(ProfileRole.role))
            .filter(Profile.user_id == member.user_id)
            .first()
        )
        if not profile or not profile.profile_roles:
            return None

        for role_entry in profile.profile_roles:
            if role_entry.role.name == assigned_role:
                return role_entry.skill_score
        return None

    return getattr(member, "unregistered_skill_score", None)


def compute_team_capability(team_id: str, db: Session) -> dict:
    """
    Compute the team's overall capability label from each member's assigned role.

    The score is the average of the members' role-specific skill scores, and the
    API returns only the resulting label to avoid exposing numeric scores.
    """
    team = (
        db.query(Team)
        .options(selectinload(Team.members))
        .filter(Team.id == team_id)
        .first()
    )
    if not team:
        raise ValueError(f"Team {team_id} not found")

    def _score_to_label(score: int) -> str:
        if score <= LEVEL_TO_MAX_SCORE["Beginner"]:
            return "Beginner"
        if score <= LEVEL_TO_MAX_SCORE["Intermediate"]:
            return "Intermediate"
        if score <= LEVEL_TO_MAX_SCORE["Advanced"]:
            return "Advanced"
        return "Expert"

    member_scores = [
        score
        for member in team.members
        if (score := _get_member_assigned_role_score(member, db)) is not None
    ]
    overall_numeric = (
        int(round(sum(member_scores) / len(member_scores))) if member_scores else 0
    )
    # return _score_to_label(overall_numeric)
    return {
        "team_id": str(team.id),
        "member_count": len(team.members),
        # "roles": role_labels,
        "overall_label": _score_to_label(overall_numeric),
    }


def compute_match_score(
    profile: Profile,
    job_posting: JobPosting,
    team: Team,
    db: Session,
) -> float:
    """
    Compute match score [0-100] for a developer against a job posting.
    Higher = better candidate.
    """
    role_name = job_posting.required_role

    # --- Component 1: role score (60%) ---
    raw_role_score = _get_role_score(profile, role_name)
    role_component = raw_role_score  # already 0-100

    # --- Component 2: gap score (25%) ---
    # How much does this developer fill the team's gap in this role?
    team_score = _get_team_avg_score_for_role(team, role_name, db)
    gap = max(0.0, 100.0 - team_score)  # larger gap = more need
    # Developer fills the gap if their score > team average
    fill_ratio = min(raw_role_score / 100.0, 1.0)
    gap_component = gap * fill_ratio  # 0-100

    # --- Component 3: seniority alignment (15%) ---
    dev_seniority = min(profile.years_experience or 1, 10) / 10.0
    team_seniority = _get_team_avg_seniority(team, db)
    # Penalise large seniority gaps (either direction)
    seniority_diff = abs(dev_seniority - team_seniority)
    seniority_component = (1.0 - seniority_diff) * 100.0  # 0-100

    match_score = (
        W_ROLE * role_component
        + W_GAP * gap_component
        + W_SENIORITY * seniority_component
    )
    return round(match_score, 2)


def generate_recommendations(job_posting_id: str, db: Session) -> list[dict]:
    """
    Generate and cache ranked recommendations for a job posting (FR-45 to FR-48).
    Returns list of dicts: {profile_id, match_score, rank}
    Excludes existing team members (FR-47).
    Filters by min_skill_level (FR-49).
    """
    posting = (
        db.query(JobPosting)
        .options(selectinload(JobPosting.team).selectinload(Team.members))
        .filter(JobPosting.id == job_posting_id)
        .first()
    )
    if not posting:
        raise ValueError(f"JobPosting {job_posting_id} not found")

    team = posting.team

    # Collect user_ids already on the team to exclude them (FR-47)
    team_user_ids = {m.user_id for m in team.members if m.is_registered and m.user_id}
    # Also exclude the team leader
    team_user_ids.add(team.leader_id)

    # Min score threshold from posting
    min_score_threshold = LEVEL_TO_MIN_SCORE.get(posting.min_skill_level, 25)

    # Load all profiles that have a score for the required role above threshold
    candidates = (
        db.query(Profile)
        .options(
            selectinload(Profile.profile_roles).selectinload(ProfileRole.role),
            selectinload(Profile.profile_skill_tags),
        )
        .join(Profile.profile_roles)
        .join(ProfileRole.role)
        .filter(
            ProfileRole.skill_score >= min_score_threshold,
            # filter by role name via the Role relationship
        )
        .all()
    )

    # Further filter: correct role name, exclude team members
    scored = []
    for profile in candidates:
        if profile.user_id in team_user_ids:
            continue
        role_score = _get_role_score(profile, posting.required_role)
        if role_score < min_score_threshold:
            continue
        score = compute_match_score(profile, posting, team, db)
        scored.append((profile, score))

    # Sort descending, take top 10 (FR-45)
    scored.sort(key=lambda x: x[1], reverse=True)
    top = scored[:10]

    # Delete old cached recommendations
    db.query(CandidateRecommendation).filter(
        CandidateRecommendation.job_posting_id == posting.id
    ).delete()

    # Insert new ones
    results = []
    for rank, (profile, score) in enumerate(top, start=1):
        rec = CandidateRecommendation(
            job_posting_id=posting.id,
            profile_id=profile.id,
            match_score=score,
            rank=rank,
        )
        db.add(rec)
        results.append(
            {"profile_id": str(profile.id), "match_score": score, "rank": rank}
        )

    db.commit()
    logger.info(
        "Generated %d recommendations for posting %s", len(results), job_posting_id
    )
    return results
