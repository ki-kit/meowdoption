from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class AdminUser(Base):
    __tablename__ = "admin_users"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Stored lowercased; login lowercases input, so matching is case-insensitive.
    email: Mapped[str] = mapped_column(String(254), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    # Deactivate instead of delete: also invalidates the admin's live tokens.
    is_active: Mapped[bool] = mapped_column(default=True)
