from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session, selectinload

from app.core.dependencies import get_current_user, get_db
from app.models.profile import (
    DegreeType,
    ExternalURL,
    ExternalURLSource,
    ExternalURLType,
    Profile,
    ProfileRole,
    ProfileSkillTag,
    ProjectHistory,
    SkillLevel,
)
from app.models.user import User

router = APIRouter()


class EducationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    institution_name: str
    degree: DegreeType
    major: Optional[str] = None
    graduation_year: Optional[int] = None


class ProjectHistoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_name: str
    duration: Optional[str] = None
    role: Optional[str] = None
    technologies_used: Optional[str] = None
    description: Optional[str] = None


class ExternalURLRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    url_type: ExternalURLType
    url_str: str
    source: ExternalURLSource


class RoleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    tier: str
    skill_level: SkillLevel


class SkillTagRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    is_ai_generated: bool


class ProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: int
    full_name: Optional[str] = None
    age: Optional[int] = None
    years_experience: Optional[int] = None
    education_entries: List[EducationRead]
    project_history_entries: List[ProjectHistoryRead]
    external_urls: List[ExternalURLRead]
    roles: List[RoleRead]
    skill_tags: List[SkillTagRead]


def _build_profile_read(profile: Profile) -> ProfileRead:
    education_entries = [
        entry for entry in profile.education_entries if not entry.is_hidden
    ]
    project_history_entries = [
        entry for entry in profile.project_history_entries if not entry.is_hidden
    ]
    external_urls = [entry for entry in profile.external_urls if not entry.is_hidden]
    roles = [
        role_entry
        for role_entry in profile.profile_roles
        if not role_entry.is_hidden and role_entry.skill_level != SkillLevel.BEGINNER
    ]
    skill_tags = [
        tag_entry for tag_entry in profile.profile_skill_tags if not tag_entry.is_hidden
    ]

    return ProfileRead(
        id=str(profile.id),
        user_id=profile.user_id,
        full_name=None if profile.is_hidden_full_name else profile.full_name,
        age=None if profile.is_hidden_age else profile.age,
        years_experience=(
            None if profile.is_hidden_years_experience else profile.years_experience
        ),
        education_entries=[
            EducationRead.model_validate(entry) for entry in education_entries
        ],
        project_history_entries=[
            ProjectHistoryRead.model_validate(entry)
            for entry in project_history_entries
        ],
        external_urls=[
            ExternalURLRead.model_validate(entry) for entry in external_urls
        ],
        roles=[
            RoleRead(
                id=role_entry.role.id,
                name=role_entry.role.name,
                tier=role_entry.role.tier.value,
                skill_level=role_entry.skill_level,
            )
            for role_entry in roles
        ],
        skill_tags=[
            SkillTagRead(
                id=tag_entry.skill_tag.id,
                name=tag_entry.skill_tag.name,
                is_ai_generated=tag_entry.is_ai_generated,
            )
            for tag_entry in skill_tags
        ],
    )


@router.get("/me", response_model=ProfileRead)
async def get_my_profile(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    profile = (
        db.query(Profile)
        .options(
            selectinload(Profile.education_entries),
            selectinload(Profile.project_history_entries),
            selectinload(Profile.external_urls),
            selectinload(Profile.profile_roles).selectinload(ProfileRole.role),
            selectinload(Profile.profile_skill_tags).selectinload(
                ProfileSkillTag.skill_tag
            ),
        )
        .filter(Profile.user_id == current_user.id)
        .first()
    )

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    return _build_profile_read(profile)
