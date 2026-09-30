from datetime import datetime
from enum import StrEnum

from sqlalchemy import Enum, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Sex(StrEnum):
    male = "male"
    female = "female"


class CatStatus(StrEnum):
    available = "available"
    pending = "pending"
    adopted = "adopted"


def _str_enum(enum_cls: type[StrEnum]) -> Enum:
    # Stored as VARCHAR, not a native DB enum: behaves the same on SQLite,
    # Postgres and MariaDB, and adding a value needs no special migration.
    return Enum(enum_cls, native_enum=False, length=20, validate_strings=True)


class Cat(Base):
    __tablename__ = "cats"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    age_months: Mapped[int]
    sex: Mapped[Sex] = mapped_column(_str_enum(Sex))
    breed: Mapped[str] = mapped_column(String(100), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    castrated: Mapped[bool] = mapped_column(default=False, index=True)
    status: Mapped[CatStatus] = mapped_column(
        _str_enum(CatStatus), default=CatStatus.available, index=True
    )
    good_with_kids: Mapped[bool] = mapped_column(default=False)
    good_with_cats: Mapped[bool] = mapped_column(default=False)
    good_with_dogs: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now()
    )
