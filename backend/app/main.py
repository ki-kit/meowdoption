from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, FastAPI, Request
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.routers import admin, applications, auth, cats, media

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
v1.include_router(auth.router)
v1.include_router(admin.router)
v1.include_router(media.router)
app.include_router(v1)


@app.middleware("http")
async def no_sniff(request: Request, call_next):
    # Browsers must trust our Content-Type, never guess from file contents
    # (matters most for user-uploaded media).
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


# Media files. The more specific mount comes first: the default meow ships
# with the code, uploads live in the media volume.
app.mount(
    "/media/default",
    StaticFiles(directory=Path(__file__).parent / "static"),
    name="media-default",
)
app.mount("/media", StaticFiles(directory=get_settings().media_dir, check_dir=False), name="media")
