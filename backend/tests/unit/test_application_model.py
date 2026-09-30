"""DB-level guarantees the API relies on but can't easily trigger itself."""

import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.models import Application, Cat, HousingType, Sex


def _cat(db_session) -> Cat:
    cat = Cat(name="Micka", sex=Sex.female, age_months=6)
    db_session.add(cat)
    db_session.commit()
    return cat


def _application(cat_id: int, email: str = "a@example.com") -> Application:
    return Application(
        cat_id=cat_id, full_name="A", email=email, housing_type=HousingType.apartment
    )


def test_same_email_twice_for_same_cat_violates_unique_constraint(db_session):
    # The backstop for two racing requests that both pass the API's own check.
    cat = _cat(db_session)
    db_session.add(_application(cat.id))
    db_session.commit()

    db_session.add(_application(cat.id))
    with pytest.raises(IntegrityError):
        db_session.commit()


def test_application_for_missing_cat_violates_foreign_key(db_session):
    # Fails on SQLite only if PRAGMA foreign_keys is on (see make_engine).
    db_session.add(_application(cat_id=999999))
    with pytest.raises(IntegrityError):
        db_session.commit()


def test_deleting_a_cat_deletes_its_applications(db_session):
    cat = _cat(db_session)
    db_session.add_all([_application(cat.id, "a@example.com"), _application(cat.id, "b@example.com")])
    db_session.commit()

    db_session.delete(cat)
    db_session.commit()

    assert db_session.scalar(select(func.count(Application.id))) == 0
