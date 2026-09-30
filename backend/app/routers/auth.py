from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select

from app.config import get_settings
from app.deps import CurrentAdmin, DbSession
from app.models import AdminUser
from app.schemas.auth import AdminRead, Token
from app.services import login_limits
from app.security import COOKIE_NAME, COOKIE_PATH, create_access_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def _cookie_options() -> dict:
    return {
        "httponly": True,  # JavaScript can't read it, so XSS can't steal it.
        "samesite": "strict",  # Not sent on cross-site requests (CSRF).
        "secure": get_settings().cookie_secure,
        "path": COOKIE_PATH,
    }


@router.post(
    "/login",
    response_model=Token,
    responses={429: {"description": "Too many failed attempts; see Retry-After"}},
)
def login(
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    request: Request,
    response: Response,
    db: DbSession,
) -> Token:
    """OAuth2 password flow: `username` is the admin's email."""
    email = form.username.strip().lower()
    # Behind nginx this is the real client: nginx overwrites X-Forwarded-For
    # and uvicorn (--proxy-headers) puts it here.
    ip = request.client.host if request.client else "unknown"

    # Checked *before* the password: while blocked, even the right password
    # gets 429, so continued guessing can't reveal it.
    if (wait := login_limits.retry_after(db, ip, email)) is not None:
        minutes = -(-wait // 60)  # round up
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            f"Too many failed login attempts. Try again in {minutes} minute{'s' if minutes != 1 else ''}.",
            headers={"Retry-After": str(wait)},
        )

    admin = db.scalar(select(AdminUser).where(AdminUser.email == email))
    # Same message for unknown email and wrong password: don't reveal which
    # emails have accounts.
    password_ok = verify_password(form.password, admin.password_hash if admin else None)
    if not (admin and password_ok and admin.is_active):
        login_limits.record_failure(db, ip, email)
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    login_limits.clear(db, ip, email)
    token = create_access_token(admin.id)
    response.set_cookie(
        COOKIE_NAME, token, max_age=get_settings().access_token_minutes * 60, **_cookie_options()
    )
    return Token(access_token=token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> None:
    # JWTs are stateless: this ends the browser session. A copied Bearer token
    # stays valid until it expires (or the admin is deactivated).
    response.delete_cookie(COOKIE_NAME, **_cookie_options())


@router.get("/me", response_model=AdminRead)
def me(admin: CurrentAdmin) -> AdminUser:
    return admin
