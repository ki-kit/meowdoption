"""Brute-force protection for the login endpoint.

Only *failed* attempts count, per client IP:
- same IP + same email: guessing one account's password
- same IP, any email: one machine trying many accounts (credential stuffing)
Deliberately no email-only rule: that would let anyone lock the real admin
out just by typing wrong passwords from somewhere else.
"""

from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import LoginFailure


def utcnow() -> datetime:
    """Naive UTC (like the other timestamps). Tests replace this to move time."""
    return datetime.now(UTC).replace(tzinfo=None)


def _window() -> timedelta:
    return timedelta(minutes=get_settings().login_window_minutes)


def retry_after(db: Session, ip: str, email: str) -> int | None:
    """Seconds until this IP may try this email again, or None if allowed now."""
    settings = get_settings()
    since = utcnow() - _window()
    recent = select(LoginFailure.created_at).where(
        LoginFailure.ip == ip, LoginFailure.created_at > since
    )
    rules = [
        (recent.where(LoginFailure.email == email), settings.login_max_failures_per_account),
        (recent, settings.login_max_failures_per_ip),
    ]

    waits = []
    for query, limit in rules:
        times = db.scalars(query.order_by(LoginFailure.created_at.desc()).limit(limit)).all()
        if len(times) >= limit:
            # Allowed again once the oldest of the last `limit` failures expires.
            waits.append((times[-1] + _window() - utcnow()).total_seconds())
    return max(1, int(max(waits)) + 1) if waits else None


def record_failure(db: Session, ip: str, email: str) -> None:
    now = utcnow()
    db.add(LoginFailure(ip=ip, email=email, created_at=now))
    # Housekeeping: nothing older than the window matters anymore.
    db.execute(delete(LoginFailure).where(LoginFailure.created_at <= now - _window()))
    db.commit()


def clear(db: Session, ip: str, email: str) -> None:
    """A successful login resets that IP's count for that account."""
    db.execute(delete(LoginFailure).where(LoginFailure.ip == ip, LoginFailure.email == email))
    db.commit()


def failure_count(db: Session) -> int:
    return db.scalar(select(func.count(LoginFailure.id)))
