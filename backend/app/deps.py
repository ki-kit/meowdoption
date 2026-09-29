from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import AdminUser
from app.security import COOKIE_NAME, decode_access_token

DbSession = Annotated[Session, Depends(get_db)]

# auto_error=False: a missing header isn't an error yet, the cookie may carry
# the token. tokenUrl makes Swagger's "Authorize" button work.
_bearer = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

_UNAUTHORIZED = HTTPException(
    status.HTTP_401_UNAUTHORIZED,
    "Not authenticated",
    headers={"WWW-Authenticate": "Bearer"},
)


def require_admin(
    request: Request,
    db: DbSession,
    bearer_token: Annotated[str | None, Depends(_bearer)],
) -> AdminUser:
    """Active admin from the Bearer header (API clients) or the cookie (SPA)."""
    token = bearer_token or request.cookies.get(COOKIE_NAME)
    admin_id = decode_access_token(token) if token else None
    admin = db.get(AdminUser, admin_id) if admin_id is not None else None
    # Checked on every request, so deactivating an admin cuts off live tokens.
    if admin is None or not admin.is_active:
        raise _UNAUTHORIZED
    return admin


CurrentAdmin = Annotated[AdminUser, Depends(require_admin)]
