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
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.db.base import Base


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    room_id: Mapped[int] = mapped_column(Integer, ForeignKey("chat_rooms.id"))
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    content: Mapped[str] = mapped_column(Text)
    message_type: Mapped[str] = mapped_column(
        String(20), default="text"
    )  # text, image, video, file
    file_url: Mapped[str] = mapped_column(String(500), nullable=True)
    file_name: Mapped[str] = mapped_column(String(255), nullable=True)
    file_size: Mapped[int] = mapped_column(Integer, nullable=True)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="messages")
    room = relationship("ChatRoom", back_populates="messages")
