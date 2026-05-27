from datetime import datetime, timedelta
from enum import Enum
from typing import Optional
import uuid

from sqlalchemy import (
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class OfferStatus(str, Enum):
    PENDING = "pending"
    INTERESTED = "interested"
    DECLINED = "declined"
    EXPIRED = "expired"
    ACCEPTED = "accepted"
    CANCELLED = "cancelled"


class Offer(Base):
    __tablename__ = "offers"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    team_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False
    )
    sender_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    recipient_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    job_posting_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("job_postings.id", ondelete="SET NULL"),
        nullable=True,
    )

    team_introduction: Mapped[str] = mapped_column(Text, nullable=False)
    proposed_role: Mapped[str] = mapped_column(String(255), nullable=False)
    expected_contributions: Mapped[str] = mapped_column(Text, nullable=False)
    compensation_details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    status: Mapped[OfferStatus] = mapped_column(
        SAEnum(OfferStatus, name="offer_status"),
        default=OfferStatus.PENDING,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.utcnow() + timedelta(days=7)
    )
    responded_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    chat_room_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("chat_rooms.id", ondelete="SET NULL"), nullable=True
    )

    team = relationship("Team")
    sender = relationship("User", foreign_keys=[sender_id])
    recipient = relationship("User", foreign_keys=[recipient_id])
    chat_room = relationship("ChatRoom")

    #
    job_posting = relationship("JobPosting")
