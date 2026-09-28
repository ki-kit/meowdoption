from typing import Annotated

from fastapi import APIRouter, Depends, FastAPI
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db import get_db
from app.routers import cats

app = FastAPI(title="Meowdoption API")
api = APIRouter(prefix="/api")


@api.get("/health")
def health(db: Annotated[Session, Depends(get_db)]) -> dict:
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "ok"}


api.include_router(cats.router)
app.include_router(api)
