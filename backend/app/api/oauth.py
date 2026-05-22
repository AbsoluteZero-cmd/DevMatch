from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.services.oauth_handler import (
    OAuthAppProvider,
    build_authorization_url,
    exchange_code_for_token,
    fetch_provider_profile_url,
    upsert_oauth_link_for_user,
    validate_state,
)
from app.services.profile_refresh import refresh_profile_external_metrics

router = APIRouter()


class OAuthAuthorizeResponse(BaseModel):
    provider: str
    authorization_url: str
    state: str


class OAuthCallbackResponse(BaseModel):
    provider: str
    message: str
    profile_id: str
    parse_status: str


class OAuthStatusResponse(BaseModel):
    provider: str
    configured: bool


@router.get("/{provider}/status", response_model=OAuthStatusResponse)
async def oauth_status(provider: OAuthAppProvider):
    configured = bool(
        provider == OAuthAppProvider.GITHUB
        and settings.GITHUB_CLIENT_ID
        and settings.GITHUB_CLIENT_SECRET
        or provider == OAuthAppProvider.HUGGING_FACE
        and settings.HUGGINGFACE_CLIENT_ID
        and settings.HUGGINGFACE_CLIENT_SECRET
    )
    return OAuthStatusResponse(provider=provider.value, configured=configured)


@router.get("/{provider}/authorize", response_model=OAuthAuthorizeResponse)
async def oauth_authorize(
    provider: OAuthAppProvider,
    current_user: User = Depends(get_current_user),
):
    authorization_url, state = build_authorization_url(provider, current_user.id)
    return OAuthAuthorizeResponse(
        provider=provider.value,
        authorization_url=authorization_url,
        state=state,
    )


@router.get("/{provider}/callback")
async def oauth_callback(
    provider: OAuthAppProvider,
    background_tasks: BackgroundTasks,
    code: str = Query(..., min_length=1),
    state: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
):
    user_id = validate_state(state=state, provider=provider)

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found for OAuth callback",
        )

    token_payload = await exchange_code_for_token(provider, code)
    provider_profile_url = await fetch_provider_profile_url(
        provider=provider,
        access_token=token_payload["access_token"],
    )

    profile = upsert_oauth_link_for_user(
        db=db,
        user=user,
        provider=provider,
        provider_profile_url=provider_profile_url,
        access_token=token_payload["access_token"],
        refresh_token=token_payload.get("refresh_token"),
        scope=token_payload.get("scope"),
        expires_at=token_payload.get("expires_at"),
    )
    db.commit()

    background_tasks.add_task(refresh_profile_external_metrics, str(profile.id))

    return RedirectResponse(
        url=f"{settings.FRONTEND_BASE_URL.rstrip('/')}/profile?oauth={provider.value}",
        status_code=status.HTTP_303_SEE_OTHER,
    )
