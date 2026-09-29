"""The DB itself guarantees at most one primary photo/sound per cat."""

import pytest
from sqlalchemy.exc import IntegrityError

from app.models import Cat, CatPhoto, CatSound, Sex


def _media(model, cat_id: int, primary: bool):
    extra = {"width": 1, "height": 1} if model is CatPhoto else {"duration_s": 1.0}
    return model(
        cat_id=cat_id, filename="x", content_type="x", size_bytes=1, is_primary=primary, **extra
    )


@pytest.mark.parametrize("model", [CatPhoto, CatSound])
def test_two_primaries_for_one_cat_are_rejected(db_session, model):
    cat = Cat(name="Luna", sex=Sex.female, age_months=18)
    db_session.add(cat)
    db_session.flush()
    db_session.add(_media(model, cat.id, primary=True))
    db_session.commit()

    db_session.add(_media(model, cat.id, primary=True))
    with pytest.raises(IntegrityError):
        db_session.commit()


@pytest.mark.parametrize("model", [CatPhoto, CatSound])
def test_many_non_primaries_are_fine(db_session, model):
    cat = Cat(name="Luna", sex=Sex.female, age_months=18)
    db_session.add(cat)
    db_session.flush()
    db_session.add_all([_media(model, cat.id, primary=p) for p in (True, False, False)])
    db_session.commit()
