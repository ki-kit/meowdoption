"""Two admins approving different applications for the same cat at once."""

import os
import threading
import time

import pytest
from sqlalchemy import select

from app.models import Application, Cat, CatStatus, HousingType, Sex
from app.services.applications import TransitionError, set_status

pytestmark = pytest.mark.skipif(
    not os.environ.get("TEST_DATABASE_URL", "").startswith("postgresql"),
    reason="row locks need Postgres",
)


def test_second_approval_waits_for_the_first_and_is_refused(db_session, session_factory):
    cat = Cat(name="Luna", sex=Sex.female, age_months=18)
    db_session.add(cat)
    db_session.flush()
    first, second = (
        Application(cat_id=cat.id, full_name=n, email=f"{n}@x.test", housing_type=HousingType.house)
        for n in ("jana", "petr")
    )
    db_session.add_all([first, second])
    db_session.commit()

    # Admin A is mid-approval: holds the cat lock, hasn't committed yet.
    admin_a = session_factory()
    locked_cat = admin_a.scalars(select(Cat).where(Cat.id == cat.id).with_for_update()).one()

    # Admin B approves the other application meanwhile.
    outcome: dict = {}

    def admin_b():
        with session_factory() as db:
            app = db.get(Application, second.id)
            db.get(Cat, cat.id)  # B already has the (stale) cat in its session
            try:
                set_status(db, app, "approved")
                outcome["result"] = "approved"
            except TransitionError as e:
                outcome["result"] = str(e)

    b = threading.Thread(target=admin_b)
    b.start()
    time.sleep(0.5)
    assert b.is_alive(), "B should be blocked on A's row lock"

    locked_cat.status = CatStatus.adopted
    admin_a.commit()
    admin_a.close()
    b.join(timeout=5)

    assert outcome["result"] == "Luna has already been adopted."
