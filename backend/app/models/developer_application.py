from datetime import datetime
from sqlalchemy import Column, Integer, ForeignKey, DateTime, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base

import enum


class ApplicationStatus(enum.Enum):
    PENDING = "pending"
    REVIEWING = "reviewing"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    CANCELLED = "cancelled"


class DeveloperApplication(Base):
    __tablename__ = "developer_applications"

    id = Column(Integer, primary_key=True, index=True)

    job_posting_id = Column(
        UUID(as_uuid=True), ForeignKey("job_postings.id"), nullable=False
    )
    applicant_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    status = Column(
        SAEnum(ApplicationStatus), default=ApplicationStatus.PENDING, nullable=False
    )

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    job_posting = relationship("JobPosting", back_populates="applications")
    applicant = relationship("User", back_populates="applications")
