from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session, selectinload

from app.core.dependencies import get_current_user, get_db
from app.models.oauth_token import OAuthProvider, OAuthToken
from app.models.profile import (
    DegreeType,
    Education,
    ExternalURL,
    ExternalURLSource,
    ExternalURLParseStatus,
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
from app.services.profile_refresh import (
    refresh_profile_external_metrics,
    reset_external_url_parse_status,
)
from app.utils.crypto import encrypt_secret

router = APIRouter()

_VISIBLE_ROLE_LEVELS = {
    SkillLevel.INTERMEDIATE,
    SkillLevel.ADVANCED,
    SkillLevel.EXPERT,
}


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
    parse_status: ExternalURLParseStatus
    parse_message: Optional[str] = None
    parsed_at: Optional[datetime] = None


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
        if not role_entry.is_hidden and role_entry.skill_level in _VISIBLE_ROLE_LEVELS
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


class ExternalURLUpsert(BaseModel):
    url_type: ExternalURLType
    url_str: str
    source: ExternalURLSource = ExternalURLSource.MANUAL
    is_hidden: bool = False
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    scopes: Optional[str] = None
    expires_at: Optional[datetime] = None


class ExternalURLUpdate(BaseModel):
    url_type: Optional[ExternalURLType] = None
    url_str: Optional[str] = None
    source: Optional[ExternalURLSource] = None
    is_hidden: Optional[bool] = None


class SkillTagCreate(BaseModel):
    id: Optional[int] = None
    name: Optional[str] = None
    is_ai_generated: bool = False


class ProfileTagsUpsert(BaseModel):
    tags: List[str]


class ProfileActionResponse(BaseModel):
    message: str
    profile: ProfileRead


def _get_profile(current_user: User, db: Session) -> Profile | None:
    return db.query(Profile).filter(Profile.user_id == current_user.id).first()


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


def _require_full_profile(current_user: User, db: Session) -> Profile:
    profile = _get_full_profile(current_user, db)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found"
        )
    return profile


def _require_profile(current_user: User, db: Session) -> Profile:
    """Fetch the profile for the current user or raise 404."""
    profile = _get_profile(current_user, db)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found"
        )
    return profile


def _external_url_type_to_oauth_provider(
    url_type: ExternalURLType,
) -> OAuthProvider | None:
    """Map ExternalURLType to OAuthProvider when applicable."""
    if url_type == ExternalURLType.GITHUB:
        return OAuthProvider.GITHUB
    if url_type == ExternalURLType.HUGGING_FACE:
        return OAuthProvider.HUGGING_FACE
    return None


def _upsert_external_url(
    db: Session,
    profile: Profile,
    payload: ExternalURLUpsert,
) -> ExternalURL:
    external_url = (
        db.query(ExternalURL)
        .filter(
            ExternalURL.profile_id == profile.id,
            ExternalURL.url_type == payload.url_type,
        )
        .first()
    )
    if external_url is None:
        external_url = ExternalURL(profile_id=profile.id, url_type=payload.url_type)
        db.add(external_url)

    external_url.url_str = payload.url_str
    external_url.source = payload.source
    external_url.is_hidden = payload.is_hidden
    reset_external_url_parse_status(external_url)

    if payload.access_token:
        provider = None
        if payload.url_type == ExternalURLType.GITHUB:
            provider = OAuthProvider.GITHUB
        elif payload.url_type == ExternalURLType.HUGGING_FACE:
            provider = OAuthProvider.HUGGING_FACE

        if provider is not None:
            token = (
                db.query(OAuthToken)
                .filter(
                    OAuthToken.profile_id == profile.id,
                    OAuthToken.provider == provider,
                )
                .first()
            )
            encrypted_access_token = encrypt_secret(payload.access_token)
            encrypted_refresh_token = (
                encrypt_secret(payload.refresh_token) if payload.refresh_token else None
            )
            if token is None:
                db.add(
                    OAuthToken(
                        profile_id=profile.id,
                        provider=provider,
                        encrypted_access_token=encrypted_access_token,
                        encrypted_refresh_token=encrypted_refresh_token,
                        scopes=payload.scopes,
                        expires_at=payload.expires_at,
                    )
                )
            else:
                token.encrypted_access_token = encrypted_access_token
                token.encrypted_refresh_token = encrypted_refresh_token
                token.scopes = payload.scopes
                token.expires_at = payload.expires_at

    return external_url


@router.get("/me", response_model=ProfileRead)
async def get_my_profile(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    profile = _require_full_profile(current_user, db)
    return _build_profile_read(profile)


@router.patch("/me", response_model=ProfileRead)
async def patch_my_profile(
    payload: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = _require_full_profile(current_user, db)

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

    profile = _require_full_profile(current_user, db)
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

    profile = _require_full_profile(current_user, db)
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

    profile = _require_full_profile(current_user, db)
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

    profile = _require_full_profile(current_user, db)
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


@router.post(
    "/links", response_model=ProfileActionResponse, status_code=status.HTTP_201_CREATED
)
async def create_link(
    payload: ExternalURLCreate,
    background_tasks: BackgroundTasks,
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
    reset_external_url_parse_status(url)
    db.commit()

    background_tasks.add_task(refresh_profile_external_metrics, str(profile.id))

    profile = _require_full_profile(current_user, db)
    return ProfileActionResponse(
        message="Parsing scheduled",
        profile=_build_profile_read(profile),
    )


@router.put("/links", response_model=ProfileActionResponse)
async def upsert_links(
    payload: List[ExternalURLUpsert],
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = _require_profile(current_user, db)

    for item in payload:
        existing = (
            db.query(ExternalURL)
            .filter(
                ExternalURL.profile_id == profile.id,
                ExternalURL.url_type == item.url_type,
            )
            .first()
        )

        _upsert_external_url(db, profile, item)

        # If an existing link was OAuth-linked but the new payload is not,
        # remove the stored OAuth token to avoid stale credentials.
        if (
            existing
            and existing.source == ExternalURLSource.OAUTH_LINKED
            and item.source != ExternalURLSource.OAUTH_LINKED
        ):
            old_provider = _external_url_type_to_oauth_provider(existing.url_type)
            if old_provider is not None:
                db.query(OAuthToken).filter(
                    OAuthToken.profile_id == profile.id,
                    OAuthToken.provider == old_provider,
                ).delete(synchronize_session=False)

    db.commit()
    background_tasks.add_task(refresh_profile_external_metrics, str(profile.id))

    profile = _require_full_profile(current_user, db)
    return ProfileActionResponse(
        message="Parsing scheduled",
        profile=_build_profile_read(profile),
    )


@router.patch("/links/{link_id}", response_model=ProfileActionResponse)
async def update_link(
    link_id: int,
    payload: ExternalURLUpdate,
    background_tasks: BackgroundTasks,
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

    # Capture original values to determine if we need to remove stored OAuth tokens
    original_source = url.source
    original_url_type = url.url_type

    update_data = payload.model_dump(exclude_unset=True)
    for field_name, value in update_data.items():
        if field_name == "url_type":
            setattr(url, "url_type", value)
        else:
            setattr(url, field_name, value)

    reset_external_url_parse_status(url)

    # If the link was previously OAuth-linked but is no longer OAuth-linked,
    # or the url_type changed away from an OAuth provider, remove the old token.
    if original_source == ExternalURLSource.OAUTH_LINKED and (
        url.source != ExternalURLSource.OAUTH_LINKED
        or original_url_type != url.url_type
    ):
        old_provider = _external_url_type_to_oauth_provider(original_url_type)
        if old_provider is not None:
            db.query(OAuthToken).filter(
                OAuthToken.profile_id == profile.id,
                OAuthToken.provider == old_provider,
            ).delete(synchronize_session=False)

    db.commit()

    background_tasks.add_task(refresh_profile_external_metrics, str(profile.id))

    profile = _require_full_profile(current_user, db)
    return ProfileActionResponse(
        message="Parsing scheduled",
        profile=_build_profile_read(profile),
    )


@router.delete("/links/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_link(
    link_id: int,
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

    # If the link was OAuth-linked, remove the corresponding stored token
    if url.source == ExternalURLSource.OAUTH_LINKED:
        provider = _external_url_type_to_oauth_provider(url.url_type)
        if provider is not None:
            db.query(OAuthToken).filter(
                OAuthToken.profile_id == profile.id,
                OAuthToken.provider == provider,
            ).delete(synchronize_session=False)

    db.delete(url)
    db.commit()


# ============================================================================
# SKILL TAGS ENDPOINTS
# ============================================================================


@router.get("/tags", response_model=List[SkillTagRead])
async def list_skill_tags(
    db: Session = Depends(get_db),
):
    tags = db.query(SkillTag).all()
    return [
        SkillTagRead(id=tag.id, name=tag.name, is_ai_generated=False) for tag in tags
    ]


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
    profile = _require_profile(current_user, db)

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

    profile = _require_full_profile(current_user, db)
    return _build_profile_read(profile)


@router.put("/tags", response_model=ProfileRead)
async def upsert_skill_tags(
    payload: ProfileTagsUpsert,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = _require_profile(current_user, db)

    normalized_tags = list(
        dict.fromkeys(tag.strip() for tag in payload.tags if tag and tag.strip())
    )

    current_links = (
        db.query(ProfileSkillTag)
        .join(SkillTag)
        .filter(ProfileSkillTag.profile_id == profile.id)
        .all()
    )

    desired_tag_names = set(normalized_tags)
    for link in current_links:
        if link.skill_tag.name not in desired_tag_names:
            db.delete(link)

    for tag_name in normalized_tags:
        tag = db.query(SkillTag).filter(SkillTag.name == tag_name).first()
        if tag is None:
            tag = SkillTag(name=tag_name)
            db.add(tag)
            db.flush()

        existing_link = (
            db.query(ProfileSkillTag)
            .filter(
                ProfileSkillTag.profile_id == profile.id,
                ProfileSkillTag.tag_id == tag.id,
            )
            .first()
        )
        if existing_link is None:
            db.add(
                ProfileSkillTag(
                    profile_id=profile.id,
                    tag_id=tag.id,
                    is_ai_generated=False,
                )
            )
        else:
            existing_link.is_ai_generated = False

    db.commit()

    profile = _require_full_profile(current_user, db)
    return _build_profile_read(profile)


@router.delete("/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_skill_tag(
    tag_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = _require_profile(current_user, db)

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
