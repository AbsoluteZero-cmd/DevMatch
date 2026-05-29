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
    job_posting_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Apply for a job posting

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
                name=f"Application {application.id} Chat",
                created_by_id=current_user.id,
                description=f"Chat between team leader and applicant for application {application.id}",
            )
            db.add(new_chat)
            db.flush()

            # Add Team Leader and Applicant to the chat
            tl_participant = ChatParticipant(
                chat_room_id=new_chat.id,
                user_id=current_user.id,
                status=ChatParticipantStatus.ACCEPTED,
            )
            dev_participant = ChatParticipant(
                chat_room_id=new_chat.id,
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
def decline_application(
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

    application.status = ApplicationStatus.DECLINED
    db.commit()
    db.refresh(application)

    return application


class OfferCreate(BaseModel):
    team_introduction: str
    proposed_role: str
    expected_contributions: str
    compensation_details: str


@router.post(
    "/applications/{application_id}/accept", response_model=DeveloperApplicationOut
)
def accept_application(
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

    # FR-50 FR-51: Create the formal offer valid for 7 days
    new_offer = Offer(
        team_id=job_posting.team_id,
        developer_id=application.applicant_id,
        job_posting_id=job_posting.id,
        team_introduction=offer_data.team_introduction,
        proposed_role=offer_data.proposed_role,
        expected_contributions=offer_data.expected_contributions,
        compensation_details=offer_data.compensation_details,
        status=OfferStatus.PENDING,
        expires_at=datetime.utcnow() + timedelta(days=7),  # FR-51 7 day validity
    )

    application.status = ApplicationStatus.ACCEPTED

    db.add(new_offer)
    db.commit()
    db.refresh(application)

    return application
