from sqlalchemy import String, Boolean, DateTime, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.db.base import Base

from enum import Enum


class UserRole(str, Enum):
    DEVELOPER = "DEVELOPER"
    TEAM_LEADER = "TEAM_LEADER"
    ADMIN = "ADMIN"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole, name="user_role"), default=UserRole.DEVELOPER, nullable=False
    )

    # Relationships
    messages = relationship("Message", back_populates="user")
    rooms_created = relationship("ChatRoom", back_populates="created_by")
    profile: Mapped["Profile"] = relationship(
        "Profile", back_populates="user", uselist=False
    )
