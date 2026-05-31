from datetime import datetime, timedelta
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.dependencies import get_db, get_current_user
from app.models.user import User, UserRole
from app.models.chatroom import ChatRoom
from app.models.chat_participant import ChatParticipant, ChatParticipantStatus
from app.services.websocket_manager import manager
from app.models.offer import Offer, OfferStatus
from app.models.team import JobPosting, JobPostingStatus, Team, TeamMember
from app.models.developer_application import (
    ApplicationStatus,
    DeveloperApplication,
)

router = APIRouter()


class DeveloperApplicationOut(BaseModel):
    id: int
    job_posting_id: uuid.UUID
    applicant_id: int
    status: ApplicationStatus
    created_at: datetime


@router.post("/apply/{job_posting_id}", response_model=DeveloperApplicationOut)
def apply_to_job(
    job_posting_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Apply for a job posting

    if current_user.role != UserRole.DEVELOPER:
        raise HTTPException(
            status_code=403, detail="Only developers can apply to job postings"
        )

    if db.query(TeamMember).filter(TeamMember.user_id == current_user.id).first():
        raise HTTPException(
            status_code=400,
            detail="You are already a member of a team and cannot apply to job postings.",
        )

    job_posting = db.query(JobPosting).filter(JobPosting.id == job_posting_id).first()
    if not job_posting:
        raise HTTPException(status_code=404, detail="Job posting not found")

    # FR-58: can apply only to open (public) job postings
    if job_posting.status != JobPostingStatus.OPEN:
        raise HTTPException(
            status_code=400, detail="Job posting is not open for applications"
        )

    all_existing_applications = (
        db.query(DeveloperApplication)
        .filter(
            DeveloperApplication.applicant_id == current_user.id,
            DeveloperApplication.status.in_(
                [ApplicationStatus.PENDING, ApplicationStatus.REVIEWING]
            ),
        )
        .count()
    )

    # FR-59: max 5 concurrent active applications per developer
    if all_existing_applications > 5:
        raise HTTPException(
            status_code=400,
            detail="You have too many pending applications. Please wait for some to be reviewed before applying to more jobs.",
        )

    existing_application = (
        db.query(DeveloperApplication)
        .filter(
            DeveloperApplication.job_posting_id == job_posting_id,
            DeveloperApplication.applicant_id == current_user.id,
        )
        .first()
    )

    # FR-60: can re-apply if previous application was declined or cancelled, but not if there's already an active application
    if existing_application and existing_application.status not in [
        ApplicationStatus.DECLINED,
        ApplicationStatus.CANCELLED,
    ]:
        raise HTTPException(
            status_code=400, detail="You have already applied to this job posting"
        )

    # FR-61:  A developer application shall not require a separate resume
    application = DeveloperApplication(
        job_posting_id=job_posting_id,
        applicant_id=current_user.id,
        status=ApplicationStatus.PENDING,
    )

    db.add(application)
    db.commit()
    db.refresh(application)

    return application


@router.get("/applications/me", response_model=List[DeveloperApplicationOut])
def get_my_applications(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    # Get all applications of the current user
    applications = (
        db.query(DeveloperApplication)
        .filter(DeveloperApplication.applicant_id == current_user.id)
        .all()
    )
    return applications


class ApplicantSummary(BaseModel):
    user_id: int
    full_name: Optional[str] = None
    profile_id: Optional[uuid.UUID] = None
    roles: List[str] = []
    skills: List[str] = []


class ApplicationDetailOut(BaseModel):
    id: int
    job_posting_id: uuid.UUID
    applicant_id: int
    status: ApplicationStatus
    created_at: datetime
    applicant: ApplicantSummary


class PostingApplicationsOut(BaseModel):
    job_posting_id: uuid.UUID
    job_posting_title: str
    applications: List[ApplicationDetailOut]


# FR-62: a team leader sees every application for one of their job postings
@router.get(
    "/postings/{job_posting_id}/applications",
    response_model=PostingApplicationsOut,
)
def list_posting_applications(
    job_posting_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job_posting = db.query(JobPosting).filter(JobPosting.id == job_posting_id).first()
    if not job_posting:
        raise HTTPException(status_code=404, detail="Job posting not found")

    is_team_member = (
        db.query(TeamMember)
        .filter(
            TeamMember.team_id == job_posting.team_id,
            TeamMember.user_id == current_user.id,
        )
        .first()
    )
    if not (
        current_user.role in [UserRole.ADMIN, UserRole.TEAM_LEADER] and is_team_member
    ):
        raise HTTPException(
            status_code=403,
            detail="Not authorized to view applications for this job posting",
        )

    applications = (
        db.query(DeveloperApplication)
        .filter(DeveloperApplication.job_posting_id == job_posting_id)
        .order_by(DeveloperApplication.created_at.desc())
        .all()
    )

    items: List[ApplicationDetailOut] = []
    for application in applications:
        user = db.query(User).filter(User.id == application.applicant_id).first()
        profile = user.profile if user else None
        roles = (
            [pr.role.name for pr in profile.profile_roles if pr.role] if profile else []
        )
        skills = (
            [pst.skill_tag.name for pst in profile.profile_skill_tags if pst.skill_tag]
            if profile
            else []
        )
        items.append(
            ApplicationDetailOut(
                id=application.id,
                job_posting_id=application.job_posting_id,
                applicant_id=application.applicant_id,
                status=application.status,
                created_at=application.created_at,
                applicant=ApplicantSummary(
                    user_id=application.applicant_id,
                    full_name=(profile.full_name if profile else None)
                    or (user.full_name if user else None),
                    profile_id=profile.id if profile else None,
                    roles=roles,
                    skills=skills,
                ),
            )
        )

    return PostingApplicationsOut(
        job_posting_id=job_posting.id,
        job_posting_title=job_posting.title,
        applications=items,
    )


# details view for team leaders and admins, also marks application as reviewing when viewed for the first time by team leader (FR-62)
@router.get("/applications/{application_id}", response_model=DeveloperApplicationOut)
def get_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    application = (
        db.query(DeveloperApplication)
        .filter(DeveloperApplication.id == application_id)
        .first()
    )
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    job_posting = (
        db.query(JobPosting).filter(JobPosting.id == application.job_posting_id).first()
    )

    # Only the applicant or team leaders/admins of the associated job posting can view
    is_team_member = (
        db.query(TeamMember)
        .filter(
            TeamMember.team_id == job_posting.team_id,
            TeamMember.user_id == current_user.id,
        )
        .first()
    )

    if current_user.id != application.applicant_id and not (
        current_user.role in [UserRole.ADMIN, UserRole.TEAM_LEADER] and is_team_member
    ):
        raise HTTPException(
            status_code=403, detail="Not authorized to view this application"
        )

    if application.applicant_id != current_user.id:
        # Mark application as reviewing when viewed by team leader for the first time
        if application.status == ApplicationStatus.PENDING:
            application.status = ApplicationStatus.REVIEWING

            # FR-63: Activate DM communication upon reviewing application
            # Create a new chat room (or fetch existing if your schema handles 1-on-1 uniqueness)
            new_chat = ChatRoom(
                name=f"Application {application.job_posting.title} Chat",
                created_by_id=current_user.id,
                description=f"Chat between team leader and applicant for application {application.id}",
            )
            db.add(new_chat)
            db.flush()

            # Add Team Leader and Applicant to the chat
            tl_participant = ChatParticipant(
                room_id=new_chat.id,
                user_id=current_user.id,
                status=ChatParticipantStatus.ACCEPTED,
            )
            dev_participant = ChatParticipant(
                room_id=new_chat.id,
                user_id=application.applicant_id,
                status=ChatParticipantStatus.ACCEPTED,
            )
            db.add_all([tl_participant, dev_participant])

            db.commit()
            db.refresh(application)

    return application


@router.post(
    "/applications/{application_id}/decline", response_model=DeveloperApplicationOut
)
async def decline_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # team leader of the associated job posting can decline an application
    application = (
        db.query(DeveloperApplication)
        .filter(DeveloperApplication.id == application_id)
        .first()
    )

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    job_posting = (
        db.query(JobPosting).filter(JobPosting.id == application.job_posting_id).first()
    )

    if not (
        current_user.role in [UserRole.ADMIN, UserRole.TEAM_LEADER]
        and db.query(TeamMember)
        .filter(
            TeamMember.team_id == job_posting.team_id,
            TeamMember.user_id == current_user.id,
        )
        .first()
    ):
        raise HTTPException(
            status_code=403, detail="Not authorized to decline this application"
        )

    # If this application had already been accepted (an offer was sent), cancel
    # that offer too so the developer's inbox no longer shows a live Join.
    related_offer = (
        db.query(Offer)
        .filter(
            Offer.job_posting_id == application.job_posting_id,
            Offer.recipient_id == application.applicant_id,
            Offer.status.in_([OfferStatus.PENDING, OfferStatus.INTERESTED]),
        )
        .first()
    )
    if related_offer:
        related_offer.status = OfferStatus.CANCELLED
        related_offer.responded_at = datetime.utcnow()

    application.status = ApplicationStatus.DECLINED
    db.commit()
    db.refresh(application)

    await manager.broadcast_to_users(
        [application.applicant_id],
        {
            "type": "application_update",
            "application_id": application.id,
            "status": application.status.value,
        },
    )

    return application


class OfferCreate(BaseModel):
    team_introduction: str
    proposed_role: str
    expected_contributions: str
    compensation_details: str


@router.post(
    "/applications/{application_id}/accept", response_model=DeveloperApplicationOut
)
async def accept_application(
    application_id: int,
    offer_data: OfferCreate,  # Added payload to capture FR-50 requirements
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    application = (
        db.query(DeveloperApplication)
        .filter(DeveloperApplication.id == application_id)
        .first()
    )

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    job_posting = (
        db.query(JobPosting).filter(JobPosting.id == application.job_posting_id).first()
    )

    if not job_posting:
        raise HTTPException(status_code=404, detail="Associated job posting not found")

    if job_posting.status != JobPostingStatus.OPEN:
        raise HTTPException(
            status_code=400, detail="Job posting is not open for accepting applications"
        )

    if not (
        current_user.role in [UserRole.ADMIN, UserRole.TEAM_LEADER]
        and db.query(TeamMember)
        .filter(
            TeamMember.team_id == job_posting.team_id,
            TeamMember.user_id == current_user.id,
        )
        .first()
    ):
        raise HTTPException(
            status_code=403, detail="Not authorized to accept this application"
        )

    # FR-52: Check max 20 open offers per team
    open_offers_count = (
        db.query(Offer)
        .filter(
            Offer.team_id == job_posting.team_id,
            Offer.status == OfferStatus.PENDING,  # Assuming PENDING or ACTIVE status
        )
        .count()
    )

    if open_offers_count >= 20:
        raise HTTPException(
            status_code=400, detail="Team has reached the maximum of 20 open offers."
        )

    previous_chat = (
        db.query(ChatRoom)
        .join(ChatParticipant, ChatParticipant.room_id == ChatRoom.id)
        .filter(
            ChatParticipant.user_id == application.applicant_id,
            ChatRoom.name == f"Application {application.job_posting.title} Chat",
        )
        .first()
    )

    participant = (
        db.query(ChatParticipant)
        .filter(
            ChatParticipant.room_id == previous_chat.id,
            ChatParticipant.user_id == application.applicant_id,
        )
        .first()
        if previous_chat
        else None
    )

    # FR-50 FR-51: Create the formal offer valid for 7 days
    new_offer = Offer(
        team_id=job_posting.team_id,
        sender_id=current_user.id,
        recipient_id=application.applicant_id,
        job_posting_id=job_posting.id,
        team_introduction=offer_data.team_introduction,
        proposed_role=offer_data.proposed_role,
        expected_contributions=offer_data.expected_contributions,
        compensation_details=offer_data.compensation_details,
        # Accepted applications skip the "interested" step: the developer is
        # already vetted, so the offer starts as INTERESTED and the inbox shows
        # Join / Cancel Join directly (no Interested button).
        status=OfferStatus.INTERESTED,
        responded_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(days=7),  # FR-51 7 day validity
        chat_room_id=(
            previous_chat.id if previous_chat else None
        ),  # use the same chat room created for the application (FR-63)
    )

    application.status = ApplicationStatus.ACCEPTED

    db.add(new_offer)
    db.commit()
    db.refresh(application)

    await manager.broadcast_to_users(
        [application.applicant_id],
        {
            "type": "application_update",
            "application_id": application.id,
            "status": application.status.value,
        },
    )

    return application
