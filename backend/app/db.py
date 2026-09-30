from collections.abc import Iterator

from sqlalchemy import MetaData, create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    # Name every constraint predictably. Alembic's SQLite batch mode can't
    # drop or alter a constraint that has no name.
    metadata = MetaData(
        naming_convention={
            "ix": "ix_%(column_0_label)s",
            "uq": "uq_%(table_name)s_%(column_0_N_name)s",
            "ck": "ck_%(table_name)s_%(constraint_name)s",
            "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
            "pk": "pk_%(table_name)s",
        }
    )


def make_engine(url: str, **kwargs):
    if not url.startswith("sqlite"):
        return create_engine(url, **kwargs)

    # SQLite forbids using a connection from another thread by default;
    # FastAPI runs sync endpoints in a threadpool, so relax that.
    engine = create_engine(url, connect_args={"check_same_thread": False}, **kwargs)

    # SQLite ignores foreign keys (and ON DELETE CASCADE) unless enabled per
    # connection. Postgres always enforces them, so do the same here.
    @event.listens_for(engine, "connect")
    def _enable_foreign_keys(dbapi_conn, _record):
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

    return engine


engine = make_engine(get_settings().database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    """FastAPI dependency: one session per request, always closed."""
    with SessionLocal() as session:
        yield session
