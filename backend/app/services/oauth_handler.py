from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from enum import Enum
from urllib.parse import urlencode

import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.oauth_token import OAuthProvider, OAuthToken
from app.models.profile import (
    ExternalURL,
    ExternalURLParseStatus,
    ExternalURLSource,
    ExternalURLType,
    Profile,
)
from app.models.user import User
from app.services.profile_refresh import reset_external_url_parse_status
from app.utils.crypto import encrypt_secret, generate_oauth_state, verify_oauth_state


class OAuthAppProvider(str, Enum):
    GITHUB = "github"
    HUGGING_FACE = "huggingface"


@dataclass
class OAuthProviderConfig:
    authorize_url: str
    token_url: str
    client_id: str
    client_secret: str
    scopes: str


def _provider_to_oauth_provider(provider: OAuthAppProvider) -> OAuthProvider:
    if provider == OAuthAppProvider.GITHUB:
        return OAuthProvider.GITHUB
    return OAuthProvider.HUGGING_FACE


def _provider_to_external_url_type(provider: OAuthAppProvider) -> ExternalURLType:
    if provider == OAuthAppProvider.GITHUB:
        return ExternalURLType.GITHUB
    return ExternalURLType.HUGGING_FACE


def _provider_config(provider: OAuthAppProvider) -> OAuthProviderConfig:
    if provider == OAuthAppProvider.GITHUB:
        if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="GitHub OAuth is not configured",
            )
        return OAuthProviderConfig(
            authorize_url="https://github.com/login/oauth/authorize",
            token_url="https://github.com/login/oauth/access_token",
            client_id=settings.GITHUB_CLIENT_ID,
            client_secret=settings.GITHUB_CLIENT_SECRET,
            scopes="read:user",
        )

    if not settings.HUGGINGFACE_CLIENT_ID or not settings.HUGGINGFACE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="HuggingFace OAuth is not configured",
        )
    return OAuthProviderConfig(
        authorize_url="https://huggingface.co/oauth/authorize",
        token_url="https://huggingface.co/oauth/token",
        client_id=settings.HUGGINGFACE_CLIENT_ID,
        client_secret=settings.HUGGINGFACE_CLIENT_SECRET,
        scopes="openid profile",
    )


def callback_url() -> str:
    return f"{settings.OAUTH_CALLBACK_BASE_URL.rstrip('/')}"


def build_authorization_url(
    provider: OAuthAppProvider, user_id: int
) -> tuple[str, str]:
    config = _provider_config(provider)
    state = generate_oauth_state(user_id=user_id, provider=provider.value)
    redirect_uri = f"{callback_url()}{settings.API_STR}/oauth/{provider.value}/callback"

    query = {
        "client_id": config.client_id,
        "redirect_uri": redirect_uri,
        "scope": config.scopes,
        "state": state,
    }
    if provider == OAuthAppProvider.HUGGING_FACE:
        query["response_type"] = "code"

    return f"{config.authorize_url}?{urlencode(query)}", state


def validate_state(state: str, provider: OAuthAppProvider) -> int:
    try:
        return verify_oauth_state(state, expected_provider=provider.value)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


async def exchange_code_for_token(provider: OAuthAppProvider, code: str) -> dict:
    config = _provider_config(provider)
    redirect_uri = f"{callback_url()}{settings.API_STR}/oauth/{provider.value}/callback"

    async with httpx.AsyncClient(timeout=20.0) as client:
        if provider == OAuthAppProvider.GITHUB:
            response = await client.post(
                config.token_url,
                headers={"Accept": "application/json"},
                data={
                    "client_id": config.client_id,
                    "client_secret": config.client_secret,
                    "code": code,
                    "redirect_uri": redirect_uri,
                },
            )
        else:
            response = await client.post(
                config.token_url,
                data={
                    "grant_type": "authorization_code",
                    "client_id": config.client_id,
                    "client_secret": config.client_secret,
                    "code": code,
                    "redirect_uri": redirect_uri,
                },
            )

    if response.status_code >= 400:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OAuth token exchange failed: {response.text}",
        )

    payload = response.json()
    if not payload.get("access_token"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OAuth token exchange response missing access_token",
        )

    expires_at = None
    expires_in = payload.get("expires_in")
    if isinstance(expires_in, int):
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

    return {
        "access_token": payload["access_token"],
        "refresh_token": payload.get("refresh_token"),
        "scope": payload.get("scope"),
        "expires_at": expires_at,
    }


async def fetch_provider_profile_url(
    provider: OAuthAppProvider, access_token: str
) -> str:
    auth_headers = {"Authorization": f"Bearer {access_token}"}

    async with httpx.AsyncClient(timeout=20.0) as client:
        if provider == OAuthAppProvider.GITHUB:
            response = await client.get(
                "https://api.github.com/user", headers=auth_headers
            )
            response.raise_for_status()
            login = response.json().get("login")
            if not login:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="GitHub profile response missing login",
                )
            return f"https://github.com/{login}"

        response = await client.get(
            "https://huggingface.co/api/whoami-v2",
            headers=auth_headers,
        )
        response.raise_for_status()
        hf_name = response.json().get("name")
        if not hf_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="HuggingFace profile response missing name",
            )
        return f"https://huggingface.co/{hf_name}"


def upsert_oauth_link_for_user(
    db: Session,
    user: User,
    provider: OAuthAppProvider,
    provider_profile_url: str,
    access_token: str,
    refresh_token: str | None,
    scope: str | None,
    expires_at: datetime | None,
) -> Profile:
    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    oauth_provider = _provider_to_oauth_provider(provider)
    url_type = _provider_to_external_url_type(provider)

    oauth_token = (
        db.query(OAuthToken)
        .filter(
            OAuthToken.profile_id == profile.id,
            OAuthToken.provider == oauth_provider,
        )
        .first()
    )

    encrypted_access_token = encrypt_secret(access_token)
    encrypted_refresh_token = encrypt_secret(refresh_token) if refresh_token else None

    if oauth_token is None:
        db.add(
            OAuthToken(
                profile_id=profile.id,
                provider=oauth_provider,
                encrypted_access_token=encrypted_access_token,
                encrypted_refresh_token=encrypted_refresh_token,
                scopes=scope,
                expires_at=expires_at,
            )
        )
    else:
        oauth_token.encrypted_access_token = encrypted_access_token
        oauth_token.encrypted_refresh_token = encrypted_refresh_token
        oauth_token.scopes = scope
        oauth_token.expires_at = expires_at

    external_url = (
        db.query(ExternalURL)
        .filter(
            ExternalURL.profile_id == profile.id,
            ExternalURL.url_type == url_type,
        )
        .first()
    )
    if external_url is None:
        external_url = ExternalURL(profile_id=profile.id, url_type=url_type)
        db.add(external_url)

    external_url.url_str = provider_profile_url
    external_url.source = ExternalURLSource.OAUTH_LINKED
    reset_external_url_parse_status(external_url)

    return profile
