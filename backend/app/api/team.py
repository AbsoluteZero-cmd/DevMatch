"""
Team & Job Posting API — DevMatch
Covers: team CRUD, job posting CRUD, candidate recommendations (FR-35 to FR-49)
"""

from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, selectinload

from app.core.dependencies import get_current_user, get_db
from app.models.profile import Profile, ProfileRole, ProfileSkillTag, SkillTag
from app.models.team import (
    CandidateRecommendation,
    JobPosting,
    JobPostingStatus,
    Team,
    TeamMember,
    TeamVisibility,
)
from app.models.user import User
from app.services.recommendation_service import generate_recommendations

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class TeamCreate(BaseModel):
    name: str
    development_goal: Optional[str] = None
    description: Optional[str] = None
    visibility: TeamVisibility = TeamVisibility.PUBLIC


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    development_goal: Optional[str] = None
    description: Optional[str] = None
    visibility: Optional[TeamVisibility] = None


class UnregisteredMemberAdd(BaseModel):
    name: str
    role_description: Optional[str] = None
    experience_description: Optional[str] = None


class JobPostingCreate(BaseModel):
    title: str
    required_role: str
    role_description: Optional[str] = None
    min_skill_level: str = "Intermediate"
    is_public: bool = True


class JobPostingUpdate(BaseModel):
    title: Optional[str] = None
    role_description: Optional[str] = None
    min_skill_level: Optional[str] = None
    is_public: Optional[bool] = None


# --- Read schemas ---

class TeamMemberRead(BaseModel):
    id: int
    is_registered: bool
    user_id: Optional[int] = None
    unregistered_name: Optional[str] = None
    unregistered_role_description: Optional[str] = None

    class Config:
        from_attributes = True


class JobPostingRead(BaseModel):
    id: UUID
    title: str
    required_role: str
    role_description: Optional[str]
    min_skill_level: str
    status: JobPostingStatus
    is_public: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TeamRead(BaseModel):
    id: UUID
    name: str
    development_goal: Optional[str]
    description: Optional[str]
    visibility: TeamVisibility
    leader_id: int
    created_at: datetime
    members: List[TeamMemberRead] = []
    job_postings: List[JobPostingRead] = []

    class Config:
        from_attributes = True


class RoleRead(BaseModel):
    id: int
    name: str
    tier: str
    skill_level: str

    class Config:
        from_attributes = True


class SkillTagRead(BaseModel):
    id: int
    name: str
    is_ai_generated: bool

    class Config:
        from_attributes = True


class CandidateRead(BaseModel):
    profile_id: UUID
    full_name: Optional[str]
    match_score: float
    rank: int
    roles: List[RoleRead] = []
    skill_tags: List[SkillTagRead] = []

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _require_team_leader(team_id: str, current_user: User, db: Session) -> Team:
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    if team.leader_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the team leader can do this")
    return team


def _build_team_read(team: Team) -> TeamRead:
    return TeamRead(
        id=team.id,
        name=team.name,
        development_goal=team.development_goal,
        description=team.description,
        visibility=team.visibility,
        leader_id=team.leader_id,
        created_at=team.created_at,
        members=[
            TeamMemberRead(
                id=m.id,
                is_registered=m.is_registered,
                user_id=m.user_id,
                unregistered_name=m.unregistered_name,
                unregistered_role_description=m.unregistered_role_description,
            )
            for m in team.members
        ],
        job_postings=[
            JobPostingRead(
                id=p.id,
                title=p.title,
                required_role=p.required_role,
                role_description=p.role_description,
                min_skill_level=p.min_skill_level,
                status=p.status,
                is_public=p.is_public,
                created_at=p.created_at,
            )
            for p in team.job_postings
        ],
    )


def _load_team(team_id: str, db: Session) -> Team:
    team = (
        db.query(Team)
        .options(
            selectinload(Team.members),
            selectinload(Team.job_postings),
        )
        .filter(Team.id == team_id)
        .first()
    )
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


# ---------------------------------------------------------------------------
# Team endpoints
# ---------------------------------------------------------------------------

@router.post("", response_model=TeamRead, status_code=201)
async def create_team(
    payload: TeamCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a team; creator becomes Team Leader (FR-35, FR-36)."""
    team = Team(
        name=payload.name,
        development_goal=payload.development_goal,
        description=payload.description,
        visibility=payload.visibility,
        leader_id=current_user.id,
    )
    db.add(team)
    db.flush()

    # Leader auto-joins as registered member
    db.add(TeamMember(team_id=team.id, user_id=current_user.id, is_registered=True))
    db.commit()
    db.refresh(team)
    return _build_team_read(_load_team(str(team.id), db))


@router.get("", response_model=List[TeamRead])
async def list_my_teams(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all teams the current user leads."""
    teams = (
        db.query(Team)
        .options(selectinload(Team.members), selectinload(Team.job_postings))
        .filter(Team.leader_id == current_user.id)
        .all()
    )
    return [_build_team_read(t) for t in teams]


@router.get("/{team_id}", response_model=TeamRead)
async def get_team(
    team_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _build_team_read(_load_team(team_id, db))


@router.patch("/{team_id}", response_model=TeamRead)
async def update_team(
    team_id: str,
    payload: TeamUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    team = _require_team_leader(team_id, current_user, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(team, field, value)
    db.commit()
    return _build_team_read(_load_team(team_id, db))


@router.delete("/{team_id}", status_code=204)
async def delete_team(
    team_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    team = _require_team_leader(team_id, current_user, db)
    db.delete(team)
    db.commit()


# ---------------------------------------------------------------------------
# Team member endpoints
# ---------------------------------------------------------------------------

@router.post("/{team_id}/members/unregistered", response_model=TeamRead, status_code=201)
async def add_unregistered_member(
    team_id: str,
    payload: UnregisteredMemberAdd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add an unregistered (non-account) member to the team (FR-37)."""
    _require_team_leader(team_id, current_user, db)
    db.add(TeamMember(
        team_id=UUID(team_id),
        is_registered=False,
        unregistered_name=payload.name,
        unregistered_role_description=payload.role_description,
        unregistered_experience_description=payload.experience_description,
    ))
    db.commit()
    return _build_team_read(_load_team(team_id, db))


@router.delete("/{team_id}/members/{member_id}", status_code=204)
async def remove_member(
    team_id: str,
    member_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_team_leader(team_id, current_user, db)
    member = db.query(TeamMember).filter(
        TeamMember.id == member_id,
        TeamMember.team_id == team_id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(member)
    db.commit()


# ---------------------------------------------------------------------------
# Job posting endpoints
# ---------------------------------------------------------------------------

VALID_ROLES = {
    "Frontend Engineer", "Backend Engineer", "Full-Stack Engineer",
    "Mobile Engineer (iOS / Android)", "DevOps / Infrastructure Engineer",
    "Data Engineer", "ML / AI Engineer", "Data Scientist",
    "Security Engineer", "QA Engineer",
}

VALID_LEVELS = {"Beginner", "Intermediate", "Advanced", "Expert"}


@router.post("/{team_id}/postings", response_model=JobPostingRead, status_code=201)
async def create_job_posting(
    team_id: str,
    payload: JobPostingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a job posting for a team (FR-41, FR-42)."""
    _require_team_leader(team_id, current_user, db)

    if payload.required_role not in VALID_ROLES:
        raise HTTPException(status_code=422, detail=f"Invalid role. Choose from: {VALID_ROLES}")
    if payload.min_skill_level not in VALID_LEVELS:
        raise HTTPException(status_code=422, detail=f"Invalid skill level. Choose from: {VALID_LEVELS}")

    posting = JobPosting(
        team_id=UUID(team_id),
        title=payload.title,
        required_role=payload.required_role,
        role_description=payload.role_description,
        min_skill_level=payload.min_skill_level,
        is_public=payload.is_public,
    )
    db.add(posting)
    db.commit()
    db.refresh(posting)
    return posting


@router.patch("/{team_id}/postings/{posting_id}", response_model=JobPostingRead)
async def update_job_posting(
    team_id: str,
    posting_id: str,
    payload: JobPostingUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_team_leader(team_id, current_user, db)
    posting = db.query(JobPosting).filter(
        JobPosting.id == posting_id, JobPosting.team_id == team_id
    ).first()
    if not posting:
        raise HTTPException(status_code=404, detail="Job posting not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(posting, field, value)
    db.commit()
    db.refresh(posting)

    # Refresh recommendations since requirements changed (FR-48)
    try:
        generate_recommendations(posting_id, db)
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning("Recommendation refresh failed: %s", exc)

    return posting


@router.post("/{team_id}/postings/{posting_id}/close", response_model=JobPostingRead)
async def close_job_posting(
    team_id: str,
    posting_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Manually close a job posting (FR-43)."""
    _require_team_leader(team_id, current_user, db)
    posting = db.query(JobPosting).filter(
        JobPosting.id == posting_id, JobPosting.team_id == team_id
    ).first()
    if not posting:
        raise HTTPException(status_code=404, detail="Job posting not found")
    posting.status = JobPostingStatus.CLOSED
    posting.closed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(posting)
    return posting


# ---------------------------------------------------------------------------
# Candidate recommendations (FR-45 to FR-49)
# ---------------------------------------------------------------------------

@router.get("/{team_id}/postings/{posting_id}/recommendations", response_model=List[CandidateRead])
async def get_recommendations(
    team_id: str,
    posting_id: str,
    min_skill_level: Optional[str] = None,
    skill_tag: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return ranked candidate recommendations for a job posting (FR-45 to FR-49).
    Regenerates if no cached results exist.
    Optional filters: min_skill_level, skill_tag (FR-49).
    """
    _require_team_leader(team_id, current_user, db)

    posting = db.query(JobPosting).filter(
        JobPosting.id == posting_id, JobPosting.team_id == team_id
    ).first()
    if not posting:
        raise HTTPException(status_code=404, detail="Job posting not found")
    if posting.status == JobPostingStatus.CLOSED:
        raise HTTPException(status_code=400, detail="Job posting is closed")

    # Generate (or use cache)
    cached = (
        db.query(CandidateRecommendation)
        .filter(CandidateRecommendation.job_posting_id == posting_id)
        .count()
    )
    if cached == 0:
        generate_recommendations(posting_id, db)

    # Load cached recommendations with profile data
    recs = (
        db.query(CandidateRecommendation)
        .options(
            selectinload(CandidateRecommendation.profile)
            .selectinload(Profile.profile_roles)
            .selectinload(ProfileRole.role),
            selectinload(CandidateRecommendation.profile)
            .selectinload(Profile.profile_skill_tags)
            .selectinload(ProfileSkillTag.skill_tag),
        )
        .filter(CandidateRecommendation.job_posting_id == posting_id)
        .order_by(CandidateRecommendation.rank)
        .all()
    )

    results = []
    for rec in recs:
        profile = rec.profile

        # Filter: min_skill_level (FR-49)
        if min_skill_level:
            role_skill_level = next(
                (pr.skill_level for pr in profile.profile_roles if pr.role.name == posting.required_role),
                None,
            )
            level_order = ["Beginner", "Intermediate", "Advanced", "Expert"]
            if role_skill_level is None:
                continue
            if level_order.index(role_skill_level.value) < level_order.index(min_skill_level):
                continue

        # Filter: skill_tag (FR-49)
        if skill_tag:
            tag_names = {pt.skill_tag.name.lower() for pt in profile.profile_skill_tags}
            if skill_tag.lower() not in tag_names:
                continue

        visible_roles = [
            pr for pr in profile.profile_roles
            if not pr.is_hidden and pr.skill_level.value != "Beginner"
        ]

        results.append(CandidateRead(
            profile_id=profile.id,
            full_name=profile.full_name if not profile.is_hidden_full_name else None,
            match_score=rec.match_score,
            rank=rec.rank,
            roles=[
                RoleRead(
                    id=pr.role.id,
                    name=pr.role.name,
                    tier=pr.role.tier.value,
                    skill_level=pr.skill_level.value,
                )
                for pr in visible_roles
            ],
            skill_tags=[
                SkillTagRead(
                    id=pt.skill_tag.id,
                    name=pt.skill_tag.name,
                    is_ai_generated=pt.is_ai_generated,
                )
                for pt in profile.profile_skill_tags
                if not pt.is_hidden
            ],
        ))

    return results


@router.post("/{team_id}/postings/{posting_id}/recommendations/refresh", status_code=200)
async def refresh_recommendations(
    team_id: str,
    posting_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Manually trigger recommendation refresh (FR-48)."""
    _require_team_leader(team_id, current_user, db)
    posting = db.query(JobPosting).filter(
        JobPosting.id == posting_id, JobPosting.team_id == team_id
    ).first()
    if not posting:
        raise HTTPException(status_code=404, detail="Job posting not found")

    results = generate_recommendations(posting_id, db)
    return {"generated": len(results)}
