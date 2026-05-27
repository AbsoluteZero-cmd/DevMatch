import enum

from sqlalchemy import Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.db.base import Base


class ChatParticipantStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    CREATOR = "creator"


class ChatParticipant(Base):
    __tablename__ = "chat_participants"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    room_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("chat_rooms.id"), nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    status: Mapped[ChatParticipantStatus] = mapped_column(
        String(20), default=ChatParticipantStatus.PENDING
    )
    role: Mapped[str] = mapped_column(String(100), nullable=True)
    invited_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    room = relationship("ChatRoom", back_populates="participants")
    user = relationship("User")
