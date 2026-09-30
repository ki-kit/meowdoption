from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Application, Cat, CatStatus
from app.schemas.application import ApplicationCreate, ApplicationReceipt

router = APIRouter(tags=["applications"])

DbSession = Annotated[Session, Depends(get_db)]

ALREADY_APPLIED = "You have already applied for this cat."


@router.post(
    "/cats/{cat_id}/applications",
    response_model=ApplicationReceipt,
    status_code=status.HTTP_201_CREATED,
    responses={404: {"description": "Cat not found"}, 409: {"description": "Cat adopted or duplicate"}},
)
def create_application(cat_id: int, payload: ApplicationCreate, db: DbSession) -> Application:
    cat = db.get(Cat, cat_id)
    if cat is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cat not found")
    # 409, not 422: the request is well-formed but clashes with the cat's state.
    if cat.status == CatStatus.adopted:
        raise HTTPException(status.HTTP_409_CONFLICT, "This cat has already found a home.")

    # Friendly early check; the unique constraint below is the real guarantee.
    duplicate = db.scalar(
        select(Application.id).where(
            Application.cat_id == cat_id, Application.email == payload.email
        )
    )
    if duplicate:
        raise HTTPException(status.HTTP_409_CONFLICT, ALREADY_APPLIED)

    application = Application(cat_id=cat_id, **payload.model_dump())
    db.add(application)
    try:
        db.commit()
    except IntegrityError:
        # Lost a race with an identical request.
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, ALREADY_APPLIED) from None
    db.refresh(application)
    return application
