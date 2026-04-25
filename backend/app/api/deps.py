"""FastAPI dependencies (authentication, etc.)."""

from __future__ import annotations

import jwt
from fastapi import Header, HTTPException, status

from app.auth.clerk import AuthUser, verify_token
from app.config import settings
from app.logging_config import get_logger

logger = get_logger(__name__)


async def require_user(authorization: str | None = Header(default=None)) -> AuthUser:
    """Validate a Clerk-issued JWT from the `Authorization: Bearer ...` header.

    Behavior:
    - Missing/invalid header → 401.
    - Clerk env vars empty → 503 ("Clerk no configurado").
    - JWT verification failure → 401.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        logger.warning("auth.missing_or_malformed_header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing or malformed",
        )

    if not settings.clerk_configured:
        logger.warning("auth.clerk_not_configured")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Clerk no configurado",
        )

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        logger.warning("auth.empty_bearer_token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer token is empty",
        )

    try:
        user = await verify_token(token)
    except jwt.PyJWTError as exc:
        logger.warning("auth.invalid_token: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        ) from exc
    except Exception as exc:  # network errors, JWKS fetch failures, etc.
        logger.warning("auth.verification_failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not verify authentication token",
        ) from exc

    return user
