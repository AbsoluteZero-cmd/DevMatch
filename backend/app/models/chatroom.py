from sqlalchemy import (
    ForeignKey,
    ForeignKey,
    Integer,
    Integer,
    String,
    Boolean,
    DateTime,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship, relationship
from datetime import datetime
from app.db.base import Base


class ChatRoom(Base):
    __tablename__ = "chat_rooms"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text)
    created_by_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    max_participants: Mapped[int] = mapped_column(Integer, default=100)

    # Relationships
    created_by = relationship("User", back_populates="rooms_created")
    messages = relationship("Message", back_populates="room")
    participants = relationship("ChatParticipant", back_populates="room")
