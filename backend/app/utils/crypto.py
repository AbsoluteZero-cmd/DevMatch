import base64
import hashlib
import hmac
import json
import os
import time
from functools import lru_cache

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import settings

NONCE_SIZE = 12
KEY_SIZE = 32


@lru_cache(maxsize=1)
def _get_encryption_key() -> bytes:
    raw_key = os.getenv(
        "OAUTH_TOKEN_ENCRYPTION_KEY", settings.OAUTH_TOKEN_ENCRYPTION_KEY or ""
    )
    if not raw_key:
        raise RuntimeError(
            "OAUTH_TOKEN_ENCRYPTION_KEY is required for token encryption"
        )

    key_bytes = base64.urlsafe_b64decode(raw_key)
    if len(key_bytes) != KEY_SIZE:
        raise RuntimeError("OAUTH_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes")
    return key_bytes


def encrypt_secret(plaintext: str) -> str:
    if plaintext is None:
        raise ValueError("plaintext is required")

    nonce = os.urandom(NONCE_SIZE)
    ciphertext = AESGCM(_get_encryption_key()).encrypt(
        nonce, plaintext.encode("utf-8"), None
    )
    return base64.urlsafe_b64encode(nonce + ciphertext).decode("ascii")


def decrypt_secret(encoded_payload: str) -> str:
    if encoded_payload is None:
        raise ValueError("encoded_payload is required")

    payload = base64.urlsafe_b64decode(encoded_payload.encode("ascii"))
    nonce = payload[:NONCE_SIZE]
    ciphertext = payload[NONCE_SIZE:]
    plaintext = AESGCM(_get_encryption_key()).decrypt(nonce, ciphertext, None)
    return plaintext.decode("utf-8")


def _state_signing_secret() -> bytes:
    return settings.SECRET_KEY.encode("utf-8")


def generate_oauth_state(user_id: int, provider: str, ttl_seconds: int = 600) -> str:
    expires_at = int(time.time()) + ttl_seconds
    payload = {
        "user_id": user_id,
        "provider": provider,
        "expires_at": expires_at,
    }
    payload_b64 = base64.urlsafe_b64encode(
        json.dumps(payload, separators=(",", ":")).encode("utf-8")
    ).decode("ascii")
    signature = hmac.new(
        _state_signing_secret(), payload_b64.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    return f"{payload_b64}.{signature}"


def verify_oauth_state(state: str, expected_provider: str) -> int:
    try:
        payload_b64, signature = state.split(".", 1)
    except ValueError as exc:
        raise ValueError("Malformed oauth state") from exc

    expected_signature = hmac.new(
        _state_signing_secret(), payload_b64.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(signature, expected_signature):
        raise ValueError("Invalid oauth state signature")

    payload = json.loads(base64.urlsafe_b64decode(payload_b64.encode("ascii")))
    if payload.get("provider") != expected_provider:
        raise ValueError("OAuth state provider mismatch")
    if int(payload.get("expires_at", 0)) < int(time.time()):
        raise ValueError("OAuth state expired")

    user_id = payload.get("user_id")
    if not isinstance(user_id, int):
        raise ValueError("OAuth state user id is invalid")
    return user_id
