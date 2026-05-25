import uuid
from enum import Enum
from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class DegreeType(str, Enum):
    PHD = "PhD"
    MASTERS = "Master's Degree"
    BACHELORS = "Bachelor's Degree"
    HIGH_SCHOOL = "High School Diploma"
    OTHER = "Other"


class RoleTier(str, Enum):
    CORE = "Core"
    SPECIALIZED = "Specialized"


class SkillLevel(str, Enum):
    BEGINNER = "Beginner"
    INTERMEDIATE = "Intermediate"
    ADVANCED = "Advanced"
    EXPERT = "Expert"


class ExternalURLType(str, Enum):
    GITHUB = "GITHUB"
    HUGGING_FACE = "HUGGING_FACE"
    LINKEDIN = "LINKEDIN"
    OTHER = "OTHER"


class ExternalURLSource(str, Enum):
    MANUAL = "MANUAL"
    OAUTH_LINKED = "OAUTH_LINKED"


class ExternalURLParseStatus(str, Enum):
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    is_hidden_full_name: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    age: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_hidden_age: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    years_experience: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_hidden_years_experience: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    last_ai_analysis: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )

    user: Mapped["User"] = relationship("User", back_populates="profile")
    education_entries: Mapped[List["Education"]] = relationship(
        "Education", back_populates="profile", cascade="all, delete-orphan"
    )
    project_history_entries: Mapped[List["ProjectHistory"]] = relationship(
        "ProjectHistory", back_populates="profile", cascade="all, delete-orphan"
    )
    external_urls: Mapped[List["ExternalURL"]] = relationship(
        "ExternalURL", back_populates="profile", cascade="all, delete-orphan"
    )
    profile_roles: Mapped[List["ProfileRole"]] = relationship(
        "ProfileRole", back_populates="profile", cascade="all, delete-orphan"
    )
    profile_skill_tags: Mapped[List["ProfileSkillTag"]] = relationship(
        "ProfileSkillTag", back_populates="profile", cascade="all, delete-orphan"
    )


class Education(Base):
    __tablename__ = "education_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    profile_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False
    )
    institution_name: Mapped[str] = mapped_column(String, nullable=False)
    degree: Mapped[DegreeType] = mapped_column(
        SAEnum(DegreeType, name="degree_type"), nullable=False
    )
    major: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    graduation_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    profile: Mapped["Profile"] = relationship(
        "Profile", back_populates="education_entries"
    )


class ProjectHistory(Base):
    __tablename__ = "project_history_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    profile_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False
    )
    project_name: Mapped[str] = mapped_column(String, nullable=False)
    duration: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    role: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    technologies_used: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    profile: Mapped["Profile"] = relationship(
        "Profile", back_populates="project_history_entries"
    )


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    tier: Mapped[RoleTier] = mapped_column(
        SAEnum(RoleTier, name="role_tier"), nullable=False
    )

    profile_roles: Mapped[List["ProfileRole"]] = relationship(
        "ProfileRole", back_populates="role"
    )


class ProfileRole(Base):
    __tablename__ = "profile_roles"

    id: Mapped[int] = mapped_column(primary_key=True)
    profile_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False
    )
    role_id: Mapped[int] = mapped_column(
        ForeignKey("roles.id", ondelete="CASCADE"), nullable=False
    )
    skill_score: Mapped[int] = mapped_column(Integer, nullable=False)
    skill_level: Mapped[SkillLevel] = mapped_column(
        SAEnum(SkillLevel, name="skill_level"), nullable=False
    )
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    profile: Mapped["Profile"] = relationship("Profile", back_populates="profile_roles")
    role: Mapped["Role"] = relationship("Role", back_populates="profile_roles")

    __table_args__ = (
        UniqueConstraint("profile_id", "role_id", name="uq_profile_role"),
    )


class ExternalURL(Base):
    __tablename__ = "external_urls"

    id: Mapped[int] = mapped_column(primary_key=True)
    profile_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False
    )
    url_type: Mapped[ExternalURLType] = mapped_column(
        "type", SAEnum(ExternalURLType, name="external_url_type"), nullable=False
    )
    url_str: Mapped[str] = mapped_column(String, nullable=False)
    source: Mapped[ExternalURLSource] = mapped_column(
        SAEnum(ExternalURLSource, name="external_url_source"),
        default=ExternalURLSource.MANUAL,
        nullable=False,
    )
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    parse_status: Mapped[ExternalURLParseStatus] = mapped_column(
        SAEnum(ExternalURLParseStatus, name="external_url_parse_status"),
        default=ExternalURLParseStatus.PENDING,
        nullable=False,
    )
    parse_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    parsed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    parsed_repo_list: Mapped[Optional[list[dict]]] = mapped_column(JSON, nullable=True)
    parsed_commit_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    parsed_hf_model_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    parsed_hf_dataset_count: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )

    profile: Mapped["Profile"] = relationship("Profile", back_populates="external_urls")

    __table_args__ = (
        UniqueConstraint("profile_id", "type", name="uq_external_url_profile_type"),
    )


class SkillTag(Base):
    __tablename__ = "skill_tags"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)

    profile_skill_tags: Mapped[List["ProfileSkillTag"]] = relationship(
        "ProfileSkillTag", back_populates="skill_tag", cascade="all, delete-orphan"
    )


class ProfileSkillTag(Base):
    __tablename__ = "profile_skill_tags"

    id: Mapped[int] = mapped_column(primary_key=True)
    profile_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False
    )
    tag_id: Mapped[int] = mapped_column(
        ForeignKey("skill_tags.id", ondelete="CASCADE"), nullable=False
    )
    is_ai_generated: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    profile: Mapped["Profile"] = relationship(
        "Profile", back_populates="profile_skill_tags"
    )
    skill_tag: Mapped["SkillTag"] = relationship(
        "SkillTag", back_populates="profile_skill_tags"
    )

    __table_args__ = (UniqueConstraint("profile_id", "tag_id", name="uq_profile_tag"),)
