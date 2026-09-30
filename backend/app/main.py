from typing import Annotated

from fastapi import APIRouter, Depends, FastAPI
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db import get_db
from app.routers import applications, cats

app = FastAPI(title="Meowdoption API", version="1.0.0")


# Unversioned on purpose: health describes the running instance, not the
# API contract, so probes/load balancers keep one stable URL across versions.
@app.get("/api/health", tags=["ops"])
def health(db: Annotated[Session, Depends(get_db)]) -> dict:
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "ok"}


# Versioned API contract. Breaking changes go into a new /api/v2 router,
# so existing clients (SPA, future mobile app) keep working on v1.
v1 = APIRouter(prefix="/api/v1")
v1.include_router(cats.router)
v1.include_router(applications.router)
app.include_router(v1)
