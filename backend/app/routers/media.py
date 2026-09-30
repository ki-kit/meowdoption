from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.deps import DbSession, require_admin
from app.models import Cat, CatPhoto, CatSound
from app.schemas.cat import MediaUpdate, PhotoRead, SoundRead
from app.services.media import (
    MAX_PHOTO_BYTES,
    MAX_PHOTOS_PER_CAT,
    MAX_SOUND_BYTES,
    MAX_SOUNDS_PER_CAT,
    MediaError,
    check_sound,
    process_photo,
)
from app.storage import LocalStorage, get_storage

router = APIRouter(tags=["media"], dependencies=[Depends(require_admin)])

Storage = Annotated[LocalStorage, Depends(get_storage)]
Media = type[CatPhoto] | type[CatSound]


def _read_limited(file: UploadFile, limit: int) -> bytes:
    # Read one byte past the limit: enough to know it's too big without
    # pulling a huge upload into memory.
    data = file.file.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(
            status.HTTP_413_CONTENT_TOO_LARGE, f"File is larger than {limit // (1024 * 1024)} MB."
        )
    return data


def _get_cat(db: Session, cat_id: int) -> Cat:
    cat = db.get(Cat, cat_id)
    if cat is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cat not found")
    return cat


def _check_limit(db: Session, model: Media, cat_id: int, limit: int) -> None:
    count = db.scalar(select(func.count(model.id)).where(model.cat_id == cat_id))
    if count >= limit:
        raise HTTPException(status.HTTP_409_CONFLICT, f"A cat can have at most {limit} of these.")


def _add(db: Session, storage: LocalStorage, item: CatPhoto | CatSound, data: bytes, folder: str, ext: str):
    """Write the file, then the row. If the DB write fails, remove the file."""
    item.filename = storage.save(folder, ext, data)
    item.size_bytes = len(data)
    # The first one becomes primary, so a cat with media always has a primary.
    has_primary = db.scalar(
        select(func.count(type(item).id)).where(
            type(item).cat_id == item.cat_id, type(item).is_primary.is_(True)
        )
    )
    item.is_primary = not has_primary
    db.add(item)
    try:
        db.commit()
    except Exception:
        db.rollback()
        storage.delete(item.filename)
        raise
    db.refresh(item)
    return item


def _make_primary(db: Session, item: CatPhoto | CatSound) -> None:
    model = type(item)
    for other in db.scalars(select(model).where(model.cat_id == item.cat_id, model.is_primary.is_(True))):
        other.is_primary = False
    # Flush the "unset" first: the partial unique index allows one primary per cat.
    db.flush()
    item.is_primary = True
    db.commit()


def _delete(db: Session, storage: LocalStorage, item: CatPhoto | CatSound) -> None:
    model, key, was_primary = type(item), item.filename, item.is_primary
    db.delete(item)
    db.flush()
    if was_primary:
        # Promote the oldest remaining one.
        successor = db.scalars(
            select(model).where(model.cat_id == item.cat_id).order_by(model.id).limit(1)
        ).first()
        if successor:
            successor.is_primary = True
    db.commit()
    # Only after the commit: if the DB work had failed, the file must stay.
    storage.delete(key)


def _get(db: Session, model: Media, item_id: int):
    item = db.get(model, item_id)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    return item


# --- Photos -------------------------------------------------------------------


@router.post("/cats/{cat_id}/photos", response_model=PhotoRead, status_code=status.HTTP_201_CREATED)
def upload_photo(cat_id: int, file: UploadFile, db: DbSession, storage: Storage) -> CatPhoto:
    _get_cat(db, cat_id)
    _check_limit(db, CatPhoto, cat_id, MAX_PHOTOS_PER_CAT)
    try:
        webp, width, height = process_photo(_read_limited(file, MAX_PHOTO_BYTES))
    except MediaError as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(e)) from None
    photo = CatPhoto(cat_id=cat_id, content_type="image/webp", width=width, height=height)
    return _add(db, storage, photo, webp, "photos", "webp")


@router.patch("/photos/{photo_id}", response_model=PhotoRead)
def update_photo(photo_id: int, payload: MediaUpdate, db: DbSession) -> CatPhoto:
    photo = _get(db, CatPhoto, photo_id)
    _make_primary(db, photo)
    return photo


@router.delete("/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_photo(photo_id: int, db: DbSession, storage: Storage) -> Response:
    _delete(db, storage, _get(db, CatPhoto, photo_id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Sounds -------------------------------------------------------------------


@router.post("/cats/{cat_id}/sounds", response_model=SoundRead, status_code=status.HTTP_201_CREATED)
def upload_sound(cat_id: int, file: UploadFile, db: DbSession, storage: Storage) -> CatSound:
    _get_cat(db, cat_id)
    _check_limit(db, CatSound, cat_id, MAX_SOUNDS_PER_CAT)
    data = _read_limited(file, MAX_SOUND_BYTES)
    try:
        ext, content_type, duration = check_sound(data)
    except MediaError as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(e)) from None
    sound = CatSound(cat_id=cat_id, content_type=content_type, duration_s=duration)
    return _add(db, storage, sound, data, "sounds", ext)


@router.patch("/sounds/{sound_id}", response_model=SoundRead)
def update_sound(sound_id: int, payload: MediaUpdate, db: DbSession) -> CatSound:
    sound = _get(db, CatSound, sound_id)
    _make_primary(db, sound)
    return sound


@router.delete("/sounds/{sound_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sound(sound_id: int, db: DbSession, storage: Storage) -> Response:
    _delete(db, storage, _get(db, CatSound, sound_id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
