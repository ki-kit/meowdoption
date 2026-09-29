from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import joinedload

from app.deps import DbSession, require_admin
from app.models import Application, ApplicationStatus, Cat
from app.schemas.application import ApplicationPage, ApplicationRead, ApplicationStatusUpdate
from app.schemas.cat import CatCreate, CatRead, CatUpdate
from app.services.applications import TransitionError, set_status

# Router-level dependency: every route in this file requires an admin, so a new
# route can't be added here unprotected by accident.
router = APIRouter(tags=["admin"], dependencies=[Depends(require_admin)])


def _get_cat(db: DbSession, cat_id: int) -> Cat:
    cat = db.get(Cat, cat_id)
    if cat is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cat not found")
    return cat


# --- Cats ---------------------------------------------------------------------


@router.post("/cats", response_model=CatRead, status_code=status.HTTP_201_CREATED)
def create_cat(payload: CatCreate, db: DbSession) -> Cat:
    cat = Cat(**payload.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.patch("/cats/{cat_id}", response_model=CatRead)
def update_cat(cat_id: int, payload: CatUpdate, db: DbSession) -> Cat:
    cat = _get_cat(db, cat_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(cat, field, value)
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/cats/{cat_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cat(cat_id: int, db: DbSession) -> Response:
    # Its applications go too (FK ON DELETE CASCADE).
    db.delete(_get_cat(db, cat_id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Applications -------------------------------------------------------------


@router.get("/applications", response_model=ApplicationPage)
def list_applications(
    db: DbSession,
    status_: Annotated[ApplicationStatus | None, Query(alias="status")] = None,
    cat_id: int | None = None,
    page: Annotated[int, Query(ge=1)] = 1,
    size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> ApplicationPage:
    stmt = select(Application)
    if status_ is not None:
        stmt = stmt.where(Application.status == status_)
    if cat_id is not None:
        stmt = stmt.where(Application.cat_id == cat_id)

    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    items = db.scalars(
        # joinedload: fetch each application's cat in the same query (no N+1).
        stmt.options(joinedload(Application.cat))
        .order_by(Application.created_at.desc(), Application.id.desc())
        .offset((page - 1) * size)
        .limit(size)
    ).all()
    return ApplicationPage(items=items, total=total, page=page, size=size)


@router.patch(
    "/applications/{application_id}",
    response_model=ApplicationRead,
    responses={409: {"description": "Transition not allowed or cat already adopted"}},
)
def update_application(
    application_id: int, payload: ApplicationStatusUpdate, db: DbSession
) -> Application:
    application = db.get(Application, application_id)
    if application is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found")
    try:
        set_status(db, application, payload.status)
    except TransitionError as e:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, str(e)) from None
    db.refresh(application)
    return application
