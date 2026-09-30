"""Where uploaded media lives. Routers only use this interface, so a
cloud backend (S3/MinIO) can replace LocalStorage later without touching them."""

import logging
import uuid
from functools import lru_cache
from pathlib import Path

from app.config import get_settings

log = logging.getLogger(__name__)

MEDIA_URL = "/media"


class LocalStorage:
    def __init__(self, root: str | Path):
        self.root = Path(root)

    def save(self, folder: str, extension: str, data: bytes) -> str:
        """Store bytes under a fresh random name; returns the storage key."""
        # Random name: the uploaded filename is never used, so "../../x" or
        # "photo.php" can't influence where or as what the file is stored.
        key = f"{folder}/{uuid.uuid4().hex}.{extension}"
        path = self.path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return key

    def delete(self, key: str) -> None:
        # Best effort: a leftover file is harmless, a crash here isn't worth it.
        try:
            self.path(key).unlink(missing_ok=True)
        except OSError:
            log.exception("Could not delete media file %s", key)

    def path(self, key: str) -> Path:
        return self.root / key

    @staticmethod
    def url(key: str) -> str:
        return f"{MEDIA_URL}/{key}"


@lru_cache
def get_storage() -> LocalStorage:
    """FastAPI dependency (tests override it with a temp directory)."""
    return LocalStorage(get_settings().media_dir)
