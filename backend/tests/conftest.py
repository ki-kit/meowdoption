import os

import pytest
from fastapi.testclient import TestClient
from pytest_bdd import given, parsers, then
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

import app.models  # noqa: F401  (registers all tables on Base.metadata)
from app.db import Base, get_db, make_engine
from app.main import app
from app.models import Application, Cat, HousingType
from app.services.admins import create_admin

# Tests use in-memory SQLite unless TEST_DATABASE_URL points at Postgres.
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "sqlite://")


@pytest.fixture
def engine():
    if TEST_DATABASE_URL == "sqlite://":
        # StaticPool keeps one shared connection, so the in-memory DB
        # survives across sessions within a test.
        from sqlalchemy.pool import StaticPool

        eng = make_engine("sqlite://", poolclass=StaticPool)
    else:
        eng = make_engine(TEST_DATABASE_URL)
    Base.metadata.create_all(eng)
    yield eng
    Base.metadata.drop_all(eng)
    eng.dispose()


@pytest.fixture
def session_factory(engine):
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


@pytest.fixture
def db_session(session_factory):
    """Session for arranging test data directly in the DB (Given steps)."""
    with session_factory() as session:
        yield session


@pytest.fixture
def client(session_factory):
    def override_get_db():
        with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def ctx() -> dict:
    """Scratch dict for passing state between BDD steps."""
    return {}


# --- Steps shared by all features ---------------------------------------


@then(parsers.parse("the response status is {code:d}"))
def response_status(ctx, code):
    assert ctx["response"].status_code == code, ctx["response"].text


BOOL_FIELDS = {"castrated", "good_with_kids", "good_with_cats", "good_with_dogs"}
INT_FIELDS = {"age_months"}


def _convert(field: str, raw: str):
    if field in BOOL_FIELDS:
        return raw.lower() == "true"
    if field in INT_FIELDS:
        return int(raw)
    return raw


@given("the following cats exist:")
def cats_exist(db_session, datatable):
    header, *rows = datatable
    for row in rows:
        db_session.add(Cat(**{f: _convert(f, v) for f, v in zip(header, row)}))
    db_session.commit()


def cat_by_name(db_session, name: str) -> Cat:
    return db_session.scalars(select(Cat).where(Cat.name == name)).one()


@given(parsers.parse('"{email}" already applied for "{name}"'))
def already_applied(db_session, email, name):
    db_session.add(
        Application(
            cat_id=cat_by_name(db_session, name).id,
            full_name="Earlier Applicant",
            email=email,
            housing_type=HousingType.apartment,
        )
    )
    db_session.commit()


@then(parsers.parse('the error is about "{field}"'))
def error_about(ctx, field):
    # FastAPI 422 body: {"detail": [{"loc": ["body", "<field>"], ...}, ...]}
    fields = {err["loc"][-1] for err in ctx["response"].json()["detail"]}
    assert field in fields, fields


ADMIN_EMAIL = "admin@meow.test"
ADMIN_PASSWORD = "correct horse battery"


@given("I am logged in as an admin")
def logged_in_admin(client, db_session):
    create_admin(db_session, ADMIN_EMAIL, ADMIN_PASSWORD)
    response = client.post(
        "/api/v1/auth/login", data={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200, response.text  # TestClient keeps the cookie
