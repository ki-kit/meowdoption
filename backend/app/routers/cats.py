from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Cat, CatStatus, Sex
from app.schemas.cat import CatPage, CatRead

router = APIRouter(prefix="/cats", tags=["cats"])

DbSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=CatPage)
def list_cats(
    db: DbSession,
    sex: Sex | None = None,
    castrated: bool | None = None,
    status: CatStatus | None = None,
    breed: str | None = None,
    good_with_kids: bool | None = None,
    good_with_cats: bool | None = None,
    good_with_dogs: bool | None = None,
    min_age_months: Annotated[int | None, Query(ge=0)] = None,
    max_age_months: Annotated[int | None, Query(ge=0)] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> CatPage:
    stmt = select(Cat)

    # Exact-match filters: only applied when the query param was given.
    exact = {
        Cat.sex: sex,
        Cat.castrated: castrated,
        Cat.status: status,
        Cat.good_with_kids: good_with_kids,
        Cat.good_with_cats: good_with_cats,
        Cat.good_with_dogs: good_with_dogs,
    }
    for column, value in exact.items():
        if value is not None:
            stmt = stmt.where(column == value)

    if breed:
        # lower() on both sides: case-insensitive on every DB backend.
        stmt = stmt.where(func.lower(Cat.breed) == breed.lower())
    if min_age_months is not None:
        stmt = stmt.where(Cat.age_months >= min_age_months)
    if max_age_months is not None:
        stmt = stmt.where(Cat.age_months <= max_age_months)

    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    items = db.scalars(
        stmt.order_by(Cat.created_at.desc(), Cat.id.desc())
        .offset((page - 1) * size)
        .limit(size)
    ).all()
    return CatPage(items=items, total=total, page=page, size=size)


@router.get("/{cat_id}", response_model=CatRead)
def get_cat(cat_id: int, db: DbSession) -> Cat:
    cat = db.get(Cat, cat_id)
    if cat is None:
        raise HTTPException(status_code=404, detail="Cat not found")
    return cat
