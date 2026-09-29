from datetime import datetime

from sqlalchemy import Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class LoginFailure(Base):
    """One failed login attempt. Kept in the DB (not in memory) so the limit
    holds across API worker processes and restarts. Rows older than the
    rate-limit window are pruned."""

    __tablename__ = "login_failures"
    __table_args__ = (Index("ix_login_failures_ip_created_at", "ip", "created_at"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    ip: Mapped[str] = mapped_column(String(45))  # fits IPv6
    email: Mapped[str] = mapped_column(String(254))
    # Naive UTC, set by the service (not the DB) so tests can move the clock.
    created_at: Mapped[datetime] = mapped_column(index=True)
