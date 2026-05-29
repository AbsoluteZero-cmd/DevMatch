import uuid
from datetime import datetime
from enum import Enum
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SAEnum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class TeamVisibility(str, Enum):
    PUBLIC = "PUBLIC"
    PRIVATE = "PRIVATE"


class JobPostingStatus(str, Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    development_goal: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    visibility: Mapped[TeamVisibility] = mapped_column(
        SAEnum(TeamVisibility, name="team_visibility"),
        default=TeamVisibility.PUBLIC,
        nullable=False,
    )
    leader_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    leader: Mapped["User"] = relationship("User", foreign_keys=[leader_id])
    members: Mapped[List["TeamMember"]] = relationship(
        "TeamMember", back_populates="team", cascade="all, delete-orphan"
    )
    job_postings: Mapped[List["JobPosting"]] = relationship(
        "JobPosting", back_populates="team", cascade="all, delete-orphan"
    )


class TeamMember(Base):
    __tablename__ = "team_members"

    id: Mapped[int] = mapped_column(primary_key=True)
    team_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("teams.id", ondelete="CASCADE"), nullable=False
    )
    # Registered member (has a user account)
    user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    # Unregistered member fields (FR-37)
    unregistered_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    unregistered_role_description: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )
    unregistered_experience_description: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )
    is_registered: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    team: Mapped["Team"] = relationship("Team", back_populates="members")
    user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[user_id])


class JobPosting(Base):
    __tablename__ = "job_postings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    team_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("teams.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    required_role: Mapped[str] = mapped_column(String, nullable=False)  # role name
    role_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    min_skill_level: Mapped[str] = mapped_column(
        String, default="Intermediate", nullable=False
    )  # Beginner / Intermediate / Advanced / Expert
    status: Mapped[JobPostingStatus] = mapped_column(
        SAEnum(JobPostingStatus, name="job_posting_status"),
        default=JobPostingStatus.OPEN,
        nullable=False,
    )
    is_public: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    team: Mapped["Team"] = relationship("Team", back_populates="job_postings")
    recommendations: Mapped[List["CandidateRecommendation"]] = relationship(
        "CandidateRecommendation",
        back_populates="job_posting",
        cascade="all, delete-orphan",
    )

    # One-to-many relationship to offers for this job posting
    offers: Mapped[List["Offer"]] = relationship(
        "Offer", back_populates="job_posting", cascade="all, delete-orphan"
    )

    applications: Mapped[List["DeveloperApplication"]] = relationship(
        "DeveloperApplication",
        back_populates="job_posting",
        cascade="all, delete-orphan",
    )


class CandidateRecommendation(Base):
    """
    Cached recommendation results per job posting.
    Refreshed whenever team composition or posting requirements change (FR-48).
    """

    __tablename__ = "candidate_recommendations"

    id: Mapped[int] = mapped_column(primary_key=True)
    job_posting_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("job_postings.id", ondelete="CASCADE"), nullable=False
    )
    profile_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False
    )
    match_score: Mapped[float] = mapped_column(Float, nullable=False)
    rank: Mapped[int] = mapped_column(Integer, nullable=False)
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    job_posting: Mapped["JobPosting"] = relationship(
        "JobPosting", back_populates="recommendations"
    )
    profile: Mapped["Profile"] = relationship("Profile")
