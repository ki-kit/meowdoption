"""Password hashing and JWT access tokens."""

from datetime import UTC, datetime, timedelta

import jwt
from pwdlib import PasswordHash

from app.config import get_settings

ALGORITHM = "HS256"
COOKIE_NAME = "meow_access_token"
# The cookie is only sent to the API, never to page/asset requests.
COOKIE_PATH = "/api"
MIN_PASSWORD_LENGTH = 12

# Argon2id with pwdlib's recommended parameters.
_hasher = PasswordHash.recommended()
# Verified against when the email is unknown, so a login for a non-existent
# account takes as long as one with a wrong password (no timing oracle).
_DUMMY_HASH = _hasher.hash("dummy-password-for-timing")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    if password_hash is None:
        _hasher.verify(password, _DUMMY_HASH)
        return False
    return _hasher.verify(password, password_hash)


def create_access_token(admin_id: int, *, expires_in: timedelta | None = None) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    expires_in = expires_in or timedelta(minutes=settings.access_token_minutes)
    payload = {"sub": str(admin_id), "iat": now, "exp": now + expires_in}
    return jwt.encode(payload, settings.secret_key.get_secret_value(), algorithm=ALGORITHM)


def decode_access_token(token: str) -> int | None:
    """Admin id from a valid token, or None if it's invalid/expired/tampered."""
    try:
        payload = jwt.decode(
            token,
            get_settings().secret_key.get_secret_value(),
            # Pin the algorithm: never let the token pick it (e.g. "none").
            algorithms=[ALGORITHM],
            options={"require": ["exp", "sub"]},
        )
        return int(payload["sub"])
    except (jwt.InvalidTokenError, ValueError):
        return None
