from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, String, func, true
from sqlalchemy.orm import Mapped, declared_attr, mapped_column, relationship

from app.db import Base

if TYPE_CHECKING:
    from app.models.cat import Cat


class MediaMixin:
    """Columns shared by photos and sounds. Each keeps its own table, so
    photo-only / sound-only columns never sit empty on the other kind."""

    id: Mapped[int] = mapped_column(primary_key=True)
    # Storage key (e.g. "photos/3f2a….webp"): random, never the uploaded name.
    filename: Mapped[str] = mapped_column(String(255))
    content_type: Mapped[str] = mapped_column(String(50))
    size_bytes: Mapped[int]
    is_primary: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    @declared_attr
    def cat_id(cls) -> Mapped[int]:
        return mapped_column(ForeignKey("cats.id", ondelete="CASCADE"), index=True)

    @declared_attr.directive
    def __table_args__(cls) -> tuple:
        # At most one primary per cat, enforced by the DB (partial unique
        # index: only rows with is_primary=true take part).
        return (
            Index(
                f"uq_{cls.__tablename__}_one_primary",
                "cat_id",
                unique=True,
                sqlite_where=cls.is_primary == true(),
                postgresql_where=cls.is_primary == true(),
            ),
        )


class CatPhoto(MediaMixin, Base):
    __tablename__ = "cat_photos"

    width: Mapped[int]
    height: Mapped[int]

    cat: Mapped["Cat"] = relationship(back_populates="photos")


class CatSound(MediaMixin, Base):
    __tablename__ = "cat_sounds"

    duration_s: Mapped[float | None]

    cat: Mapped["Cat"] = relationship(back_populates="sounds")
