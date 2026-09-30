from datetime import datetime
from enum import StrEnum

from sqlalchemy import ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.cat import Cat, _str_enum


class HousingType(StrEnum):
    apartment = "apartment"
    house = "house"
    house_with_garden = "house_with_garden"


class ApplicationStatus(StrEnum):
    new = "new"
    approved = "approved"
    rejected = "rejected"


class Application(Base):
    __tablename__ = "applications"
    # One application per person per cat. Enforced by the DB so two racing
    # requests (double-click) can't both slip past the API's own check.
    # Its (cat_id, email) index also serves "applications for cat X" lookups.
    __table_args__ = (UniqueConstraint("cat_id", "email"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    # CASCADE: deleting a cat (admin, step 7) removes its applications too.
    cat_id: Mapped[int] = mapped_column(ForeignKey("cats.id", ondelete="CASCADE"))
    full_name: Mapped[str] = mapped_column(String(100))
    # Stored lowercased, so duplicate checks are case-insensitive on every DB.
    email: Mapped[str] = mapped_column(String(254))
    phone: Mapped[str] = mapped_column(String(30), default="")
    message: Mapped[str] = mapped_column(Text, default="")
    housing_type: Mapped[HousingType] = mapped_column(_str_enum(HousingType))
    has_other_pets: Mapped[bool] = mapped_column(default=False)
    status: Mapped[ApplicationStatus] = mapped_column(
        _str_enum(ApplicationStatus), default=ApplicationStatus.new, index=True
    )
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    cat: Mapped[Cat] = relationship(back_populates="applications")
