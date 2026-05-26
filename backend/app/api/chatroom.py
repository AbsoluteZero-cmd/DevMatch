from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.message import Message
from app.models.chatroom import ChatRoom
from app.models.chat_participant import ChatParticipant
from app.services.websocket_manager import manager

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
    status: Optional[str] = None

    class Config:
        from_attributes = True


class MessageCreate(BaseModel):
    content: str
    message_type: str = "text"


class MessageResponse(BaseModel):
    id: int
    room_id: int
    user_id: int
    content: str
    message_type: str
    created_at: datetime

    class Config:
        from_attributes = True


class InviteRequest(BaseModel):
    chat_id: Optional[int] = None
    user_id: int
    role: Optional[str] = None


class ParticipantResponse(BaseModel):
    id: int
    room_id: int
    user_id: int
    status: str
    role: Optional[str]
    invited_at: datetime

    class Config:
        from_attributes = True


class InboxItemResponse(BaseModel):
    id: int
    room_id: int
    room_name: str
    room_description: str
    status: str
    role: Optional[str]
    invited_at: datetime
    created_by_id: int
    created_by_name: str
    last_message: Optional[str]

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
    db.flush()

    db.add(ChatParticipant(
        room_id=db_room.id,
        user_id=current_user.id,
        status="accepted",
    ))
    db.commit()
    db.refresh(db_room)

    return db_room


@router.get("/rooms/", response_model=List[ChatRoomResponse])
async def get_rooms(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rooms = (
        db.query(ChatRoom)
        .filter(ChatRoom.is_active == True)
        .offset(skip)
        .limit(limit)
        .all()
    )

    # if status is pending, show the room but mark it as pending
    for room in rooms:
        # check if current user is a participant and get their status
        participant = (
            db.query(ChatParticipant)
            .filter(
                ChatParticipant.room_id == room.id,
                ChatParticipant.user_id == current_user.id,
            )
            .first()
        )

        if participant:
            room.status = participant.status
        else:
            room.status = "not_invited"
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


@router.post("/rooms/{room_id}/messages", response_model=MessageResponse)
async def send_message(
    room_id: int,
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    participant = (
        db.query(ChatParticipant)
        .filter(
            ChatParticipant.room_id == room_id,
            ChatParticipant.user_id == current_user.id,
            ChatParticipant.status == "accepted",
        )
        .first()
    )

    if not participant and room.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="You are not a participant of this room. Please accept the invitation first.")

    db_message = Message(
        room_id=room_id,
        user_id=current_user.id,
        content=message_data.content,
        message_type=message_data.message_type,
    )

    db.add(db_message)
    db.commit()
    db.refresh(db_message)

    participants = db.query(ChatParticipant).filter(ChatParticipant.room_id == room_id).all()
    participant_ids = [p.user_id for p in participants]

    

    await manager.broadcast_to_users(
        participant_ids,
        {
            "type": "new_message",
            "room_id": room_id,
            "message_id": db_message.id,
            "user_id": current_user.id,
            "full_name": current_user.full_name,
            "content": db_message.content,
            "message_type": db_message.message_type,
            "timestamp": db_message.created_at.isoformat(),
        },
    )

    return db_message


@router.get("/inbox", response_model=List[InboxItemResponse])
async def get_inbox(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    rooms = (
        db.query(ChatRoom)
        .outerjoin(ChatParticipant, ChatParticipant.room_id == ChatRoom.id)
        .filter(
            ChatRoom.is_active == True,
            or_(
                ChatParticipant.user_id == current_user.id,
                ChatRoom.created_by_id == current_user.id,
            ),
        )
        .distinct()
        .all()
    )

    items = []
    for room in rooms:
        participant = (
            db.query(ChatParticipant)
            .filter(
                ChatParticipant.room_id == room.id,
                ChatParticipant.user_id == current_user.id,
            )
            .first()
        )

        status = participant.status if participant else "accepted"
        role = participant.role if participant else None
        invited_at = participant.invited_at if participant else room.created_at

        creator = db.query(User).filter(User.id == room.created_by_id).first()

        last_msg = (
            db.query(Message)
            .filter(Message.room_id == room.id)
            .order_by(Message.created_at.desc())
            .first()
        )

        items.append(InboxItemResponse(
            id=participant.id if participant else room.id,
            room_id=room.id,
            room_name=room.name,
            room_description=room.description,
            status=status,
            role=role,
            invited_at=invited_at,
            created_by_id=room.created_by_id,
            created_by_name=creator.full_name if creator else "Unknown",
            last_message=last_msg.content if last_msg else None,
        ))

    return items


@router.post("/inbox/invite", response_model=ParticipantResponse)
async def invite_to_chat(
    invite: InviteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not invite.chat_id:
        room = ChatRoom(
            name=f"{current_user.full_name}'s Chat",
            description="A new chat room",
            created_by_id=current_user.id,
            max_participants=100,
        )
        db.add(room)
        db.flush()
        invite.chat_id = room.id

        db.add(ChatParticipant(
            room_id=room.id,
            user_id=current_user.id,
            status="accepted",
        ))
    else:
        room = db.query(ChatRoom).filter(ChatRoom.id == invite.chat_id).first()
        if not room:
            raise HTTPException(status_code=404, detail="Chat room not found")

    if room.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the room creator can invite users")

    target_user = db.query(User).filter(User.id == invite.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    existing = (
        db.query(ChatParticipant)
        .filter(
            ChatParticipant.room_id == invite.chat_id,
            ChatParticipant.user_id == invite.user_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="User already invited to this chat")

    participant = ChatParticipant(
        room_id=invite.chat_id,
        user_id=invite.user_id,
        status="pending",
        role=invite.role,
    )
    db.add(participant)
    db.commit()
    db.refresh(participant)

    await manager.send_to_user(
        invite.user_id,
        {
            "type": "inbox_invite",
            "room_id": invite.chat_id,
            "room_name": room.name,
            "invited_by": current_user.full_name,
            "role": invite.role,
        },
    )

    return participant


@router.post("/inbox/{chat_id}/accept", response_model=ParticipantResponse)
async def accept_chat(
    chat_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    participant = (
        db.query(ChatParticipant)
        .filter(
            ChatParticipant.room_id == chat_id,
            ChatParticipant.user_id == current_user.id,
        )
        .first()
    )

    if not participant:
        raise HTTPException(status_code=404, detail="Invitation not found")

    if participant.status != "pending":
        raise HTTPException(status_code=400, detail="Invitation is not pending")

    participant.status = "accepted"
    db.commit()
    db.refresh(participant)



    await manager.broadcast_to_users(
        [participant.user_id],
        {
            "type": "inbox_accepted",
            "user_id": current_user.id,
            "full_name": current_user.full_name,
            "room_id": chat_id,
        },
    )

    return participant


@router.post("/inbox/{chat_id}/decline", response_model=ParticipantResponse)
async def decline_chat(
    chat_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    participant = (
        db.query(ChatParticipant)
        .filter(
            ChatParticipant.room_id == chat_id,
            ChatParticipant.user_id == current_user.id,
        )
        .first()
    )

    if not participant:
        raise HTTPException(status_code=404, detail="Invitation not found")

    if participant.status != "pending":
        raise HTTPException(status_code=400, detail="Invitation is not pending")

    participant.status = "declined"
    db.commit()
    db.refresh(participant)

    await manager.broadcast_to_users(
        [participant.user_id],
        {
            "type": "inbox_declined",
            "user_id": current_user.id,
            "room_id": chat_id,
        },
    )

    return participant
