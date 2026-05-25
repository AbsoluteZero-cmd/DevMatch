"""
AI Analysis endpoint — DevMatch
POST /profile/analyze   → triggers LLM analysis for the current user's profile
GET  /profile/analyze/status → returns last_ai_analysis timestamp
"""

from datetime import timezone
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.profile import Profile
from app.models.user import User
from app.services.ai_service import analyse_profile

router = APIRouter()


class AnalyzeResponse(BaseModel):
    message: str
    profile_id: str


class AnalysisStatusResponse(BaseModel):
    last_ai_analysis: str | None  # ISO-8601 string or null


def _get_profile_or_404(current_user: User, db: Session) -> Profile:
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Complete onboarding first.",
        )
    return profile


# ---------------------------------------------------------------------------
# POST /profile/analyze
# ---------------------------------------------------------------------------

@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger AI profile analysis",
    description=(
        "Runs the LLM-based skill scoring pipeline for the authenticated developer. "
        "Analysis runs in the background; poll /analyze/status to check completion. "
        "Re-triggers automatically whenever the profile is updated (FR-34)."
    ),
)
async def trigger_analysis(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = _get_profile_or_404(current_user, db)

    # Run in background so the HTTP response returns immediately (< 3 s, NFR-02).
    # The actual LLM call is allowed up to 10 s (NFR-03).
    background_tasks.add_task(_run_analysis_task, str(profile.id))

    return AnalyzeResponse(
        message="Analysis started. Results will be available shortly.",
        profile_id=str(profile.id),
    )


def _run_analysis_task(profile_id: str) -> None:
    """
    Background task wrapper. Opens its own DB session because FastAPI's
    request-scoped session is closed by the time this runs.
    """
    from app.db.session import SessionLocal
    import logging

    logger = logging.getLogger(__name__)
    db = SessionLocal()
    try:
        analyse_profile(profile_id, db)
    except Exception as exc:
        logger.error("Background AI analysis failed for profile %s: %s", profile_id, exc)
        # Future: push to a retry queue and notify user (NFR-08)
    finally:
        db.close()


# ---------------------------------------------------------------------------
# POST /profile/analyze/sync  (blocking — for onboarding flow)
# ---------------------------------------------------------------------------

@router.post(
    "/analyze/sync",
    response_model=AnalyzeResponse,
    status_code=status.HTTP_200_OK,
    summary="Trigger AI profile analysis (blocking)",
    description=(
        "Same as /analyze but waits for the analysis to finish before responding. "
        "Used during onboarding so the results page can display scores immediately."
    ),
)
async def trigger_analysis_sync(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = _get_profile_or_404(current_user, db)

    try:
        analyse_profile(str(profile.id), db)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI analysis failed: {exc}",
        )

    return AnalyzeResponse(
        message="Analysis complete.",
        profile_id=str(profile.id),
    )


# ---------------------------------------------------------------------------
# GET /profile/analyze/status
# ---------------------------------------------------------------------------

@router.get(
    "/analyze/status",
    response_model=AnalysisStatusResponse,
    summary="Check when the last AI analysis ran",
)
async def get_analysis_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = _get_profile_or_404(current_user, db)

    last = profile.last_ai_analysis
    return AnalysisStatusResponse(
        last_ai_analysis=(
            last.replace(tzinfo=timezone.utc).isoformat() if last else None
        )
    )
