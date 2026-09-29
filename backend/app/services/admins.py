from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AdminUser
from app.security import MIN_PASSWORD_LENGTH, hash_password


class AdminError(ValueError):
    pass


def create_admin(db: Session, email: str, password: str) -> AdminUser:
    email = email.strip().lower()
    if "@" not in email:
        raise AdminError(f"Not an email address: {email!r}")
    if len(password) < MIN_PASSWORD_LENGTH:
        raise AdminError(f"Password must be at least {MIN_PASSWORD_LENGTH} characters")
    if db.scalar(select(AdminUser.id).where(AdminUser.email == email)):
        raise AdminError(f"Admin {email} already exists")

    admin = AdminUser(email=email, password_hash=hash_password(password))
    db.add(admin)
    db.commit()
    return admin
