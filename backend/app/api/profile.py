from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session, selectinload

from app.core.dependencies import get_current_user, get_db
from app.models.profile import (
    DegreeType,
    Education,
    ExternalURL,
    ExternalURLSource,
    ExternalURLType,
    Profile,
    ProfileRole,
    ProfileSkillTag,
    ProjectHistory,
    Role,
    SkillLevel,
    SkillTag,
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


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    age: Optional[int] = None
    years_experience: Optional[int] = None
    is_hidden_full_name: Optional[bool] = None
    is_hidden_age: Optional[bool] = None
    is_hidden_years_experience: Optional[bool] = None


class EducationCreate(BaseModel):
    institution_name: str
    degree: DegreeType
    major: Optional[str] = None
    graduation_year: Optional[int] = None
    is_hidden: bool = False


class EducationUpdate(BaseModel):
    institution_name: Optional[str] = None
    degree: Optional[DegreeType] = None
    major: Optional[str] = None
    graduation_year: Optional[int] = None
    is_hidden: Optional[bool] = None


class ProjectHistoryCreate(BaseModel):
    project_name: str
    duration: Optional[str] = None
    role: Optional[str] = None
    technologies_used: Optional[str] = None
    description: Optional[str] = None
    is_hidden: bool = False


class ProjectHistoryUpdate(BaseModel):
    project_name: Optional[str] = None
    duration: Optional[str] = None
    role: Optional[str] = None
    technologies_used: Optional[str] = None
    description: Optional[str] = None
    is_hidden: Optional[bool] = None


class ExternalURLCreate(BaseModel):
    url_type: ExternalURLType
    url_str: str
    source: ExternalURLSource = ExternalURLSource.MANUAL
    is_hidden: bool = False


class ExternalURLUpdate(BaseModel):
    url_type: Optional[ExternalURLType] = None
    url_str: Optional[str] = None
    source: Optional[ExternalURLSource] = None
    is_hidden: Optional[bool] = None


class SkillTagCreate(BaseModel):
    id: Optional[int] = None
    name: Optional[str] = None
    is_ai_generated: bool = False


def _get_full_profile(current_user: User, db: Session) -> Profile:
    """Load profile with all relationships for returning complete state."""
    return (
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


def _require_profile(current_user: User, db: Session) -> Profile:
    """Fetch the profile for the current user or raise 404."""
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found"
        )
    return profile


@router.get("/me", response_model=ProfileRead)
async def get_my_profile(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    profile = _get_full_profile(current_user, db)

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    return _build_profile_read(profile)


@router.patch("/me", response_model=ProfileRead)
async def patch_my_profile(
    payload: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = _get_full_profile(current_user, db)

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field_name, value in update_data.items():
        setattr(profile, field_name, value)

    db.commit()
    db.refresh(profile)

    return _build_profile_read(profile)


# ============================================================================
# EDUCATION ENDPOINTS
# ============================================================================


@router.post(
    "/education", response_model=ProfileRead, status_code=status.HTTP_201_CREATED
)
async def create_education(
    payload: EducationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = _require_profile(current_user, db)

    education = Education(
        profile_id=profile.id,
        institution_name=payload.institution_name,
        degree=payload.degree,
        major=payload.major,
        graduation_year=payload.graduation_year,
        is_hidden=payload.is_hidden,
    )
    db.add(education)
    db.commit()

    profile = _get_full_profile(current_user, db)
    return _build_profile_read(profile)


@router.patch("/education/{education_id}", response_model=ProfileRead)
async def update_education(
    education_id: int,
    payload: EducationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = _require_profile(current_user, db)

    education = (
        db.query(Education)
        .filter(Education.id == education_id, Education.profile_id == profile.id)
        .first()
    )
    if not education:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Education entry not found",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field_name, value in update_data.items():
        setattr(education, field_name, value)

    db.commit()

    profile = _get_full_profile(current_user, db)
    return _build_profile_read(profile)


@router.delete("/education/{education_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_education(
    education_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = _require_profile(current_user, db)

    education = (
        db.query(Education)
        .filter(Education.id == education_id, Education.profile_id == profile.id)
        .first()
    )
    if not education:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Education entry not found",
        )

    db.delete(education)
    db.commit()


# ============================================================================
# PROJECT HISTORY ENDPOINTS
# ============================================================================


@router.post(
    "/projects", response_model=ProfileRead, status_code=status.HTTP_201_CREATED
)
async def create_project(
    payload: ProjectHistoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = _require_profile(current_user, db)

    project = ProjectHistory(
        profile_id=profile.id,
        project_name=payload.project_name,
        duration=payload.duration,
        role=payload.role,
        technologies_used=payload.technologies_used,
        description=payload.description,
        is_hidden=payload.is_hidden,
    )
    db.add(project)
    db.commit()

    profile = _get_full_profile(current_user, db)
    return _build_profile_read(profile)


@router.patch("/projects/{project_id}", response_model=ProfileRead)
async def update_project(
    project_id: int,
    payload: ProjectHistoryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = _require_profile(current_user, db)

    project = (
        db.query(ProjectHistory)
        .filter(
            ProjectHistory.id == project_id, ProjectHistory.profile_id == profile.id
        )
        .first()
    )
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project entry not found",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field_name, value in update_data.items():
        setattr(project, field_name, value)

    db.commit()

    profile = _get_full_profile(current_user, db)
    return _build_profile_read(profile)


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = _require_profile(current_user, db)

    project = (
        db.query(ProjectHistory)
        .filter(
            ProjectHistory.id == project_id, ProjectHistory.profile_id == profile.id
        )
        .first()
    )
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project entry not found",
        )

    db.delete(project)
    db.commit()


# ============================================================================
# EXTERNAL URL (LINKS) ENDPOINTS
# ============================================================================


@router.post("/links", response_model=ProfileRead, status_code=status.HTTP_201_CREATED)
async def create_link(
    payload: ExternalURLCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = _require_profile(current_user, db)

    url = ExternalURL(
        profile_id=profile.id,
        url_type=payload.url_type,
        url_str=payload.url_str,
        source=payload.source,
        is_hidden=payload.is_hidden,
    )
    db.add(url)
    db.commit()

    profile = _get_full_profile(current_user, db)
    return _build_profile_read(profile)


@router.patch("/links/{link_id}", response_model=ProfileRead)
async def update_link(
    link_id: int,
    payload: ExternalURLUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = _require_profile(current_user, db)

    url = (
        db.query(ExternalURL)
        .filter(ExternalURL.id == link_id, ExternalURL.profile_id == profile.id)
        .first()
    )
    if not url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Link not found",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field_name, value in update_data.items():
        if field_name == "url_type":
            setattr(url, "url_type", value)
        else:
            setattr(url, field_name, value)

    db.commit()

    profile = _get_full_profile(current_user, db)
    return _build_profile_read(profile)


@router.delete("/links/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_link(
    link_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    url = (
        db.query(ExternalURL)
        .filter(ExternalURL.id == link_id, ExternalURL.profile_id == profile.id)
        .first()
    )
    if not url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Link not found",
        )

    db.delete(url)
    db.commit()


# ============================================================================
# SKILL TAGS ENDPOINTS
# ============================================================================


@router.post("/tags", response_model=ProfileRead, status_code=status.HTTP_201_CREATED)
async def add_skill_tag(
    payload: SkillTagCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Add a skill tag to profile.
    If id is provided, reuse existing tag.
    Otherwise, create a new tag from name.
    """
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    if payload.id is not None:
        # Reuse existing tag
        tag = db.query(SkillTag).filter(SkillTag.id == payload.id).first()
        if not tag:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Skill tag not found",
            )
    else:
        # Create new tag
        if not payload.name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tag name is required when creating new tag",
            )
        tag = db.query(SkillTag).filter(SkillTag.name == payload.name).first()
        if not tag:
            tag = SkillTag(name=payload.name)
            db.add(tag)
            db.flush()

    # Check if already linked
    existing = (
        db.query(ProfileSkillTag)
        .filter(
            ProfileSkillTag.profile_id == profile.id, ProfileSkillTag.tag_id == tag.id
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tag already added to profile",
        )

    # Add to profile
    profile_tag = ProfileSkillTag(
        profile_id=profile.id,
        tag_id=tag.id,
        is_ai_generated=payload.is_ai_generated,
    )
    db.add(profile_tag)
    db.commit()

    profile = _get_full_profile(current_user, db)
    return _build_profile_read(profile)


@router.delete("/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_skill_tag(
    tag_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    profile_tag = (
        db.query(ProfileSkillTag)
        .filter(
            ProfileSkillTag.profile_id == profile.id, ProfileSkillTag.tag_id == tag_id
        )
        .first()
    )
    if not profile_tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found on profile",
        )

    db.delete(profile_tag)
    db.commit()
