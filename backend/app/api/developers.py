"""
Public developer profile view (read-only) — used by team leaders to open a
developer's profile from the search/recommendations cards.
Mounted at prefix `/developers`.
"""

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session, selectinload

from app.core.dependencies import get_db, get_current_user
from app.models.user import User, UserRole
from app.models.profile import (
    Profile,
    ProfileRole,
    ProfileSkillTag,
)
from app.models.offer import Offer

router = APIRouter()


class DeveloperRoleOut(BaseModel):
    name: str
    tier: str
    skill_level: str


class DeveloperEducationOut(BaseModel):
    institution_name: str
    degree: Optional[str] = None
    major: Optional[str] = None
    graduation_year: Optional[int] = None


class DeveloperProjectOut(BaseModel):
    project_name: str
    role: Optional[str] = None
    duration: Optional[str] = None
    technologies_used: Optional[str] = None
    description: Optional[str] = None


class DeveloperLinkOut(BaseModel):
    url_type: str
    url_str: str


class DeveloperProfileOut(BaseModel):
    profile_id: uuid.UUID
    user_id: Optional[int] = None
    full_name: Optional[str] = None
    years_experience: Optional[int] = None
    roles: List[DeveloperRoleOut] = []
    skills: List[str] = []
    education: List[DeveloperEducationOut] = []
    projects: List[DeveloperProjectOut] = []
    links: List[DeveloperLinkOut] = []


class DeveloperListItem(BaseModel):
    profile_id: uuid.UUID
    user_id: Optional[int] = None
    full_name: Optional[str] = None
    roles: List[DeveloperRoleOut] = []
    skills: List[str] = []
    already_offered: bool = False


@router.get("", response_model=List[DeveloperListItem])
def list_developers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profiles = (
        db.query(Profile)
        .join(User, User.id == Profile.user_id)
        .filter(User.role == UserRole.DEVELOPER)
        .options(
            selectinload(Profile.profile_roles).selectinload(ProfileRole.role),
            selectinload(Profile.profile_skill_tags).selectinload(
                ProfileSkillTag.skill_tag
            ),
        )
        .all()
    )

    # Developers the current leader has already sent an offer to.
    sent_recipient_ids = {
        rid
        for (rid,) in db.query(Offer.recipient_id)
        .filter(Offer.sender_id == current_user.id)
        .all()
    }

    items: List[DeveloperListItem] = []
    for profile in profiles:
        roles = [
            DeveloperRoleOut(
                name=pr.role.name,
                tier=pr.role.tier.value,
                skill_level=pr.skill_level.value,
            )
            for pr in profile.profile_roles
            if pr.role and not pr.is_hidden
        ]
        skills = [
            pst.skill_tag.name
            for pst in profile.profile_skill_tags
            if pst.skill_tag and not pst.is_hidden
        ]
        items.append(
            DeveloperListItem(
                profile_id=profile.id,
                user_id=profile.user_id,
                full_name=None if profile.is_hidden_full_name else profile.full_name,
                roles=roles,
                skills=skills,
                already_offered=profile.user_id in sent_recipient_ids,
            )
        )

    return items


@router.get("/{profile_id}", response_model=DeveloperProfileOut)
def get_developer_profile(
    profile_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = (
        db.query(Profile)
        .options(
            selectinload(Profile.profile_roles).selectinload(ProfileRole.role),
            selectinload(Profile.profile_skill_tags).selectinload(
                ProfileSkillTag.skill_tag
            ),
            selectinload(Profile.education_entries),
            selectinload(Profile.project_history_entries),
            selectinload(Profile.external_urls),
        )
        .filter(Profile.id == profile_id)
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Developer profile not found")

    roles = [
        DeveloperRoleOut(
            name=pr.role.name,
            tier=pr.role.tier.value,
            skill_level=pr.skill_level.value,
        )
        for pr in profile.profile_roles
        if pr.role and not pr.is_hidden
    ]

    skills = [
        pst.skill_tag.name
        for pst in profile.profile_skill_tags
        if pst.skill_tag and not pst.is_hidden
    ]

    education = [
        DeveloperEducationOut(
            institution_name=e.institution_name,
            degree=e.degree.value if e.degree else None,
            major=e.major,
            graduation_year=e.graduation_year,
        )
        for e in profile.education_entries
        if not e.is_hidden
    ]

    projects = [
        DeveloperProjectOut(
            project_name=p.project_name,
            role=p.role,
            duration=p.duration,
            technologies_used=p.technologies_used,
            description=p.description,
        )
        for p in profile.project_history_entries
    ]

    links = [
        DeveloperLinkOut(url_type=u.url_type.value, url_str=u.url_str)
        for u in profile.external_urls
        if not u.is_hidden
    ]

    return DeveloperProfileOut(
        profile_id=profile.id,
        user_id=profile.user_id,
        full_name=None if profile.is_hidden_full_name else profile.full_name,
        years_experience=(
            None if profile.is_hidden_years_experience else profile.years_experience
        ),
        roles=roles,
        skills=skills,
        education=education,
        projects=projects,
        links=links,
    )
