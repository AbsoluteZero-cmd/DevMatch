from fastapi import (
    APIRouter,
    Depends,
)
from pydantic import BaseModel
from typing import List
from sqlalchemy.orm import Session
from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.message import Message


from app.models.chatroom import ChatRoom

router = APIRouter()


class ChatRoomCreate(BaseModel):
    name: str
    description: str
    max_participants: int = 100


class ChatRoomResponse(BaseModel):
    id: int
    name: str
    description: str
    created_by_id: int
    max_participants: int
    is_active: bool

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    id: int
    room_id: int
    user_id: int
    content: str
    message_type: str
    created_at: str

    class Config:
        from_attributes = True


@router.post("/rooms/", response_model=ChatRoomResponse)
async def create_room(
    room_data: ChatRoomCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_room = ChatRoom(
        name=room_data.name,
        description=room_data.description,
        created_by_id=current_user.id,
        max_participants=room_data.max_participants,
    )

    db.add(db_room)
    db.commit()
    db.refresh(db_room)

    return db_room


@router.get("/rooms/", response_model=List[ChatRoomResponse])
async def get_rooms(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    rooms = (
        db.query(ChatRoom)
        .filter(ChatRoom.is_active == True)
        .offset(skip)
        .limit(limit)
        .all()
    )
    return rooms


@router.get("/rooms/{room_id}/messages", response_model=List[MessageResponse])
async def get_room_messages(
    room_id: int, skip: int = 0, limit: int = 50, db: Session = Depends(get_db)
):
    messages = (
        db.query(Message)
        .filter(Message.room_id == room_id)
        .order_by(Message.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return messages[::-1]
