from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlparse

import httpx

from app.db.session import SessionLocal
from app.models.oauth_token import OAuthProvider, OAuthToken
from app.models.profile import ExternalURLParseStatus, ExternalURLType, Profile
from app.utils.crypto import decrypt_secret

logger = logging.getLogger(__name__)


def reset_external_url_parse_status(
    external_url, message: str = "Parsing scheduled"
) -> None:
    external_url.parse_status = ExternalURLParseStatus.PENDING
    external_url.parse_message = message
    external_url.parsed_at = None
    external_url.parsed_repo_list = None
    external_url.parsed_commit_count = None
    external_url.parsed_hf_model_count = None
    external_url.parsed_hf_dataset_count = None


def _github_owner_from_url(url: str) -> str | None:
    path = urlparse(url).path.strip("/")
    if not path:
        return None
    return path.split("/")[0]


def _huggingface_owner_from_url(url: str) -> str | None:
    path = urlparse(url).path.strip("/")
    if not path:
        return None
    return path.split("/")[0]


async def _fetch_github_metrics(
    client: httpx.AsyncClient,
    owner: str,
    headers: dict[str, str] | None = None,
) -> dict[str, Any]:
    repos_response = await client.get(
        f"https://api.github.com/users/{owner}/repos",
        params={"per_page": 100, "sort": "updated"},
        headers=headers,
    )
    repos_response.raise_for_status()
    repos_payload = repos_response.json()

    repo_list = []
    for repo in repos_payload:
        repo_list.append(
            {
                "name": repo.get("name"),
                "html_url": repo.get("html_url"),
                "description": repo.get("description"),
                "stargazers_count": repo.get("stargazers_count", 0),
                "forks_count": repo.get("forks_count", 0),
                "top_language": repo.get("language"),
            }
        )

    since = datetime.now(timezone.utc) - timedelta(days=365)
    commits_response = await client.get(
        "https://api.github.com/search/commits",
        params={
            "q": f"author:{owner} committer-date:>={since.date().isoformat()}",
            "per_page": 1,
        },
        headers={
            "Accept": "application/vnd.github.cloak-preview+json",
            **(headers or {}),
        },
    )
    commits_response.raise_for_status()
    commits_payload = commits_response.json()

    return {
        "parsed_repo_list": repo_list,
        "parsed_commit_count": int(commits_payload.get("total_count", 0)),
    }


async def _fetch_huggingface_metrics(
    client: httpx.AsyncClient,
    owner: str,
    headers: dict[str, str] | None = None,
) -> dict[str, Any]:
    models_response = await client.get(
        "https://huggingface.co/api/models",
        params={"author": owner, "limit": 1000},
        headers=headers,
    )
    models_response.raise_for_status()

    datasets_response = await client.get(
        "https://huggingface.co/api/datasets",
        params={"author": owner, "limit": 1000},
        headers=headers,
    )
    datasets_response.raise_for_status()

    return {
        "parsed_hf_model_count": len(models_response.json()),
        "parsed_hf_dataset_count": len(datasets_response.json()),
    }


def _token_headers(
    token_row: OAuthToken | None, provider: OAuthProvider
) -> dict[str, str]:
    if token_row is None:
        return {}

    try:
        access_token = decrypt_secret(token_row.encrypted_access_token)
    except Exception:
        logger.exception(
            "Failed to decrypt %s token for profile %s",
            provider.value,
            token_row.profile_id,
        )
        return {}

    if provider == OAuthProvider.GITHUB:
        return {"Authorization": f"Bearer {access_token}"}

    if provider == OAuthProvider.HUGGING_FACE:
        return {"Authorization": f"Bearer {access_token}"}

    return {}


async def refresh_profile_external_metrics(profile_id: str) -> None:
    db = SessionLocal()
    try:
        profile = db.query(Profile).filter(Profile.id == profile_id).first()
        if not profile:
            return

        github_token = (
            db.query(OAuthToken)
            .filter(
                OAuthToken.profile_id == profile.id,
                OAuthToken.provider == OAuthProvider.GITHUB,
            )
            .first()
        )
        huggingface_token = (
            db.query(OAuthToken)
            .filter(
                OAuthToken.profile_id == profile.id,
                OAuthToken.provider == OAuthProvider.HUGGING_FACE,
            )
            .first()
        )

        async with httpx.AsyncClient(timeout=20.0) as client:
            for external_url in profile.external_urls:
                if external_url.url_type == ExternalURLType.GITHUB:
                    owner = _github_owner_from_url(external_url.url_str)
                    if not owner:
                        external_url.parse_status = ExternalURLParseStatus.FAILED
                        external_url.parse_message = (
                            "Could not derive GitHub owner from URL"
                        )
                        external_url.parsed_at = datetime.now(timezone.utc)
                        continue
                    try:
                        headers = _token_headers(github_token, OAuthProvider.GITHUB)
                        metrics = await _fetch_github_metrics(client, owner, headers)
                        external_url.parsed_repo_list = metrics["parsed_repo_list"]
                        external_url.parsed_commit_count = metrics[
                            "parsed_commit_count"
                        ]
                        external_url.parse_status = ExternalURLParseStatus.SUCCESS
                        external_url.parse_message = (
                            "GitHub parsing completed successfully"
                        )
                        external_url.parsed_at = datetime.now(timezone.utc)
                    except Exception as exc:
                        external_url.parse_status = ExternalURLParseStatus.FAILED
                        external_url.parse_message = f"GitHub parsing failed: {exc}"
                        external_url.parsed_at = datetime.now(timezone.utc)
                elif external_url.url_type == ExternalURLType.HUGGING_FACE:
                    owner = _huggingface_owner_from_url(external_url.url_str)
                    if not owner:
                        external_url.parse_status = ExternalURLParseStatus.FAILED
                        external_url.parse_message = (
                            "Could not derive HuggingFace owner from URL"
                        )
                        external_url.parsed_at = datetime.now(timezone.utc)
                        continue
                    try:
                        headers = _token_headers(
                            huggingface_token, OAuthProvider.HUGGING_FACE
                        )
                        metrics = await _fetch_huggingface_metrics(
                            client, owner, headers
                        )
                        external_url.parsed_hf_model_count = metrics[
                            "parsed_hf_model_count"
                        ]
                        external_url.parsed_hf_dataset_count = metrics[
                            "parsed_hf_dataset_count"
                        ]
                        external_url.parse_status = ExternalURLParseStatus.SUCCESS
                        external_url.parse_message = (
                            "HuggingFace parsing completed successfully"
                        )
                        external_url.parsed_at = datetime.now(timezone.utc)
                    except Exception as exc:
                        external_url.parse_status = ExternalURLParseStatus.FAILED
                        external_url.parse_message = (
                            f"HuggingFace parsing failed: {exc}"
                        )
                        external_url.parsed_at = datetime.now(timezone.utc)

        db.commit()
    except Exception:
        db.rollback()
        logger.exception(
            "Failed to refresh cached profile metrics for profile %s", profile_id
        )
    finally:
        db.close()
