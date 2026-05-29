from datetime import datetime, timedelta
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.dependencies import get_db, get_current_user
from app.models.user import User, UserRole
from app.models.message import Message
from app.models.chatroom import ChatRoom
from app.models.chat_participant import ChatParticipant, ChatParticipantStatus
from app.services.websocket_manager import manager
from app.models.offer import Offer, OfferStatus
from app.models.team import JobPosting, JobPostingStatus, Team, TeamMember
from backend.app.models.developer_application import (
    ApplicationStatus,
    DeveloperApplication,
)

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

    offer_status: Optional[str] = None
    team_id: Optional[str] = None
    job_posting_id: Optional[str] = None
    team_introduction: Optional[str] = None
    proposed_role: Optional[str] = None
    expected_contributions: Optional[str] = None
    compensation_details: Optional[str] = None

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

    db.add(
        ChatParticipant(
            room_id=db_room.id,
            user_id=current_user.id,
            status="accepted",
        )
    )
    db.commit()
    db.refresh(db_room)

    return db_room


@router.get("/rooms/", response_model=List[ChatRoomResponse])
async def get_rooms(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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
        raise HTTPException(
            status_code=403,
            detail="You are not a participant of this room. Please accept the invitation first.",
        )

    db_message = Message(
        room_id=room_id,
        user_id=current_user.id,
        content=message_data.content,
        message_type=message_data.message_type,
    )

    db.add(db_message)
    db.commit()
    db.refresh(db_message)

    participants = (
        db.query(ChatParticipant).filter(ChatParticipant.room_id == room_id).all()
    )
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

        offer = db.query(Offer).filter(Offer.chat_room_id == room.id).first()

        items.append(
            InboxItemResponse(
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
                offer_status=offer.status.value if offer else None,
                team_id=str(offer.team_id) if offer else None,
                job_posting_id=(
                    str(offer.job_posting_id)
                    if offer and offer.job_posting_id
                    else None
                ),
                team_introduction=offer.team_introduction if offer else None,
                proposed_role=offer.proposed_role if offer else None,
                expected_contributions=offer.expected_contributions if offer else None,
                compensation_details=offer.compensation_details if offer else None,
            )
        )

    return items


class OfferRequest(BaseModel):
    team_id: uuid.UUID
    recipient_id: int
    job_posting_id: uuid.UUID
    team_introduction: Optional[str] = None
    proposed_role: Optional[str] = None
    expected_contributions: Optional[str] = None
    compensation_details: Optional[str] = None

    chat_room_id: Optional[int] = None

    class Config:
        from_attributes = True


# Send offer


# FR-50: The system shall allow a Team Leader to send an Offer to any developer
@router.post("/inbox/offer", response_model=ParticipantResponse)
async def send_offer(
    offer_data: OfferRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != UserRole.TEAM_LEADER:
        raise HTTPException(
            status_code=403,
            detail="Only users with the team leader role can send offers.",
        )

    team = db.query(Team).filter(Team.id == offer_data.team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    if team.leader_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="You can only send offers for teams you lead."
        )

    open_offers_count = (
        db.query(Offer)
        .filter(
            Offer.team_id == team.id,
            Offer.status.in_([OfferStatus.PENDING]),
        )
        .count()
    )

    # FR-52: max 20 concurrent open offers per team
    if open_offers_count >= 20:
        raise HTTPException(
            status_code=400,
            detail="Cannot send offer: Your team already has 20 open offers. Please wait for some offers to be accepted or declined before sending more.",
        )

    posting = (
        db.query(JobPosting)
        .filter(
            JobPosting.id == offer_data.job_posting_id,
            JobPosting.team_id == offer_data.team_id,
        )
        .first()
    )
    if not posting:
        raise HTTPException(
            status_code=404,
            detail="Job posting not found for this team.",
        )

    # FR-57:
    existing_rejected_offer = (
        db.query(Offer)
        .filter(
            Offer.recipient_id == offer_data.recipient_id,
            Offer.job_posting_id == offer_data.job_posting_id,
            Offer.status.in_([OfferStatus.DECLINED, OfferStatus.EXPIRED]),
        )
        .first()
    )

    if existing_rejected_offer:
        raise HTTPException(
            status_code=400,
            detail="Cannot send offer: This developer has previously declined or let an offer expire for this job posting.",
        )

    db_offer = Offer(
        team_id=offer_data.team_id,
        sender_id=current_user.id,
        recipient_id=offer_data.recipient_id,
        team_introduction=offer_data.team_introduction,
        proposed_role=offer_data.proposed_role,
        expected_contributions=offer_data.expected_contributions,
        compensation_details=offer_data.compensation_details,
        job_posting_id=offer_data.job_posting_id,
        expires_at=datetime.utcnow() + timedelta(days=7),  # Offers expire after 7 days
    )
    db.add(db_offer)  # Add to database
    db.flush()

    # Create chat room for the offer
    db_room = ChatRoom(
        name=f"Offer from {current_user.full_name}",
        description=offer_data.team_introduction,
        created_by_id=current_user.id,
        max_participants=2,
    )

    db.add(db_room)
    db.flush()

    db_offer.chat_room_id = db_room.id

    # Add sender as creator participant
    db.add(
        ChatParticipant(
            room_id=db_room.id,
            user_id=current_user.id,
            status=ChatParticipantStatus.CREATOR,
            role="Team Leader",
        )
    )

    # Add recipient as pending participant
    participant = ChatParticipant(
        room_id=db_room.id,
        user_id=offer_data.recipient_id,
        status=ChatParticipantStatus.PENDING,
        role=offer_data.proposed_role,
    )
    db.add(participant)

    db.commit()
    db.refresh(participant)

    await manager.broadcast_to_users(
        [offer_data.recipient_id],
        {
            "type": "new_offer",
            "user_id": current_user.id,
            "full_name": current_user.full_name,
            "room_id": db_room.id,
            "team_id": str(offer_data.team_id),
            "team_introduction": offer_data.team_introduction,
            "proposed_role": offer_data.proposed_role,
            "expected_contributions": offer_data.expected_contributions,
            "compensation_details": offer_data.compensation_details,
        },
    )

    participant = (
        db.query(ChatParticipant)
        .filter(
            ChatParticipant.room_id == db_room.id,
            ChatParticipant.user_id == current_user.id,
        )
        .first()
    )

    return participant


# FR-53, 54: If developer selects interested to be able to chat with the team, change the status to interested and notify the team leader
@router.post("/inbox/{chat_id}/interested", response_model=ParticipantResponse)
async def accept_chat_request(
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

    if participant.status != ChatParticipantStatus.PENDING:
        raise HTTPException(status_code=400, detail="Invitation is not pending")

    participant.status = ChatParticipantStatus.ACCEPTED
    db.commit()
    db.refresh(participant)

    offer = (
        db.query(Offer)
        .filter(Offer.chat_room_id == chat_id, Offer.recipient_id == current_user.id)
        .first()
    )

    offer.status = OfferStatus.INTERESTED
    db.commit()

    await manager.broadcast_to_users(
        [participant.user_id, participant.room.created_by_id],
        {
            "type": "Interested in offer",
            "user_id": current_user.id,
            "full_name": current_user.full_name,
            "room_id": chat_id,
        },
    )

    return participant


# FR-53: rejects the offer and notifies the team leader
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

    if participant.status != ChatParticipantStatus.PENDING:
        raise HTTPException(status_code=400, detail="Invitation is not pending")

    participant.status = ChatParticipantStatus.DECLINED
    db.commit()
    db.refresh(participant)

    offer = (
        db.query(Offer)
        .filter(Offer.chat_room_id == chat_id, Offer.recipient_id == current_user.id)
        .first()
    )

    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    offer.status = OfferStatus.DECLINED
    db.commit()

    await manager.broadcast_to_users(
        [offer.recipient_id, offer.sender_id],
        {
            "type": "Offer declined",
            "user_id": current_user.id,
            "room_id": chat_id,
        },
    )

    return participant


@router.post("/inbox/{chat_id}/join", response_model=ParticipantResponse)
async def join_team(
    chat_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    offer = (
        db.query(Offer)
        .filter(Offer.chat_room_id == chat_id, Offer.recipient_id == current_user.id)
        .first()
    )

    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    offer.status = OfferStatus.ACCEPTED

    # FR-55-a: When an offer is accepted, automatically add developer to the team
    team_member = (
        db.query(TeamMember)
        .filter(
            TeamMember.team_id == offer.team_id, TeamMember.user_id == current_user.id
        )
        .first()
    )
    if not team_member:
        team_member = TeamMember(
            team_id=offer.team_id,
            user_id=current_user.id,
            is_registered=True,
            joined_at=datetime.utcnow(),
        )
        db.add(team_member)

    # FR-55-b: When an offer is accepted, automatically close the associated job posting
    if offer.job_posting_id:
        job_posting = (
            db.query(JobPosting).filter(JobPosting.id == offer.job_posting_id).first()
        )
        if job_posting:
            job_posting.status = JobPostingStatus.CLOSED

    # FR-55-c: When an offer is accepted, cancel all other offers for that developoer
    other_offers = (
        db.query(Offer)
        .filter(
            Offer.recipient_id == current_user.id,
            Offer.id != offer.id,
        )
        .all()
    )

    for o in other_offers:
        o.status = OfferStatus.CANCELLED

    # FR-55-d:  cancel all pending applications submitted by that developer.
    pending_applications = (
        db.query(DeveloperApplication)
        .filter(
            DeveloperApplication.applicant_id == current_user.id,
            DeveloperApplication.status == ApplicationStatus.PENDING,
        )
        .all()
    )

    for app in pending_applications:
        app.status = ApplicationStatus.CANCELLED

    db.commit()

    participant = (
        db.query(ChatParticipant)
        .filter(
            ChatParticipant.room_id == chat_id,
            ChatParticipant.user_id == current_user.id,
        )
        .first()
    )

    await manager.broadcast_to_users(
        [offer.recipient_id, offer.sender_id],
        {
            "type": "Offer accepted",
            "user_id": current_user.id,
            "room_id": chat_id,
        },
    )

    return participant


# FR-56: When a developer cancels a Join, record event, and re-open job posting.
@router.post("/inbox/{chat_id}/cancel-join", response_model=ParticipantResponse)
async def cancel_join(
    chat_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    offer = (
        db.query(Offer)
        .filter(Offer.chat_room_id == chat_id, Offer.recipient_id == current_user.id)
        .first()
    )

    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    # Record the cancellation
    offer.status = OfferStatus.CANCELLED

    # FR-56 Re-open job posting
    if offer.job_posting_id:
        job_posting = (
            db.query(JobPosting).filter(JobPosting.id == offer.job_posting_id).first()
        )
        if job_posting:
            job_posting.status = JobPostingStatus.OPEN

    # remove form team if they were added
    team_member = (
        db.query(TeamMember)
        .filter(
            TeamMember.team_id == offer.team_id, TeamMember.user_id == current_user.id
        )
        .first()
    )
    if team_member:
        db.delete(team_member)

    db.commit()

    participant = (
        db.query(ChatParticipant)
        .filter(
            ChatParticipant.room_id == chat_id,
            ChatParticipant.user_id == current_user.id,
        )
        .first()
    )

    await manager.broadcast_to_users(
        [offer.recipient_id, offer.sender_id],
        {
            "type": "Offer cancelled",
            "user_id": current_user.id,
            "room_id": chat_id,
        },
    )

    return participant
