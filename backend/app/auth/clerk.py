"""Clerk JWT verification helpers.

Fetches the JWKS from `CLERK_JWKS_URL` on first use, caches the keys in
memory keyed by `kid` with a 1-hour TTL based on `time.monotonic()`,
and verifies tokens with PyJWT's RS256 implementation.
"""

from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass
from typing import Any

import httpx
import jwt
from jwt import PyJWKClient  # noqa: F401  # imported for reference; we manage cache manually

from app.config import settings
from app.logging_config import get_logger

logger = get_logger(__name__)

_CACHE_TTL_SECONDS = 60 * 60  # 1 hour


@dataclass
class _CachedKey:
    key: Any  # cryptography public key object suitable for PyJWT.decode
    fetched_at: float


class JWKSCache:
    """Async-safe in-memory cache of Clerk JWKS keys keyed by `kid`."""

    def __init__(self, jwks_url: str, ttl_seconds: int = _CACHE_TTL_SECONDS) -> None:
        self._jwks_url = jwks_url
        self._ttl = ttl_seconds
        self._keys: dict[str, _CachedKey] = {}
        self._lock = asyncio.Lock()

    def _is_fresh(self, entry: _CachedKey) -> bool:
        return (time.monotonic() - entry.fetched_at) < self._ttl

    async def fetch_keys(self) -> dict[str, Any]:
        """Fetch JWKS from Clerk and update the cache; returns the kid→key map."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(self._jwks_url)
            response.raise_for_status()
            jwks = response.json()

        now = time.monotonic()
        new_keys: dict[str, _CachedKey] = {}
        for jwk in jwks.get("keys", []):
            kid = jwk.get("kid")
            if not kid:
                continue
            try:
                key = jwt.algorithms.RSAAlgorithm.from_jwk(jwk)
            except (ValueError, jwt.InvalidKeyError) as exc:  # type: ignore[attr-defined]
                logger.warning("skipping invalid JWK kid=%s: %s", kid, exc)
                continue
            new_keys[kid] = _CachedKey(key=key, fetched_at=now)

        self._keys = new_keys
        return {kid: entry.key for kid, entry in self._keys.items()}

    async def get_key(self, kid: str) -> Any:
        """Return the public key for `kid`, refreshing the cache if needed."""
        cached = self._keys.get(kid)
        if cached is not None and self._is_fresh(cached):
            return cached.key

        async with self._lock:
            # Re-check after acquiring the lock (another coroutine may have refreshed).
            cached = self._keys.get(kid)
            if cached is not None and self._is_fresh(cached):
                return cached.key
            await self.fetch_keys()

        cached = self._keys.get(kid)
        if cached is None:
            raise jwt.InvalidTokenError(f"unknown signing key kid={kid}")
        return cached.key


# Module-level cache instance, reused across requests.
_jwks_cache: JWKSCache | None = None


def _get_cache() -> JWKSCache:
    global _jwks_cache
    if _jwks_cache is None or _jwks_cache._jwks_url != settings.clerk_jwks_url:
        _jwks_cache = JWKSCache(settings.clerk_jwks_url)
    return _jwks_cache


@dataclass
class AuthUser:
    sub: str
    email: str | None


async def verify_token(token: str) -> AuthUser:
    """Verify a Clerk-issued JWT and return the authenticated user.

    Raises `jwt.InvalidTokenError` (or a subclass) on any verification failure.
    Callers should translate that to an HTTP 401 response.
    """
    if not settings.clerk_configured:
        # Defensive: callers should check this before invoking verify_token.
        raise RuntimeError("Clerk no configurado")

    try:
        unverified_header = jwt.get_unverified_header(token)
    except jwt.PyJWTError as exc:
        raise jwt.InvalidTokenError(f"malformed token header: {exc}") from exc

    kid = unverified_header.get("kid")
    if not kid:
        raise jwt.InvalidTokenError("token header missing 'kid'")

    cache = _get_cache()
    key = await cache.get_key(kid)

    decode_kwargs: dict[str, Any] = {
        "key": key,
        "algorithms": ["RS256"],
        "issuer": settings.clerk_issuer,
        "options": {"require": ["exp", "iss", "sub"]},
    }
    if settings.clerk_audience:
        decode_kwargs["audience"] = settings.clerk_audience

    claims = jwt.decode(token, **decode_kwargs)

    sub = claims.get("sub")
    if not isinstance(sub, str) or not sub:
        raise jwt.InvalidTokenError("token missing 'sub' claim")

    email = claims.get("email")
    if not isinstance(email, str):
        # Clerk sometimes embeds email under different keys; fall back.
        email = claims.get("email_address")
        if not isinstance(email, str):
            email = None

    return AuthUser(sub=sub, email=email)
