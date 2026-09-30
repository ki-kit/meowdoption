"""Validation and processing of uploaded photos and sounds."""

import io

import filetype
import mutagen
from PIL import Image, ImageOps, UnidentifiedImageError

MAX_PHOTO_BYTES = 5 * 1024 * 1024
MAX_SOUND_BYTES = 1 * 1024 * 1024
MAX_PHOTOS_PER_CAT = 10
MAX_SOUNDS_PER_CAT = 5

PHOTO_FORMATS = {"JPEG", "PNG", "WEBP"}
MAX_PHOTO_SIDE = 1600
# Refuse "decompression bombs": tiny files that expand to gigapixel images.
Image.MAX_IMAGE_PIXELS = 40_000_000

# Detected from the file's first bytes (magic numbers), not its name.
SOUND_TYPES = {
    "audio/mpeg": "mp3",
    "audio/ogg": "ogg",
    "audio/x-wav": "wav",
}


class MediaError(ValueError):
    pass


def process_photo(data: bytes) -> tuple[bytes, int, int]:
    """Validate an image and re-encode it as WebP. Returns (bytes, width, height).

    Re-encoding (instead of storing the upload as-is):
    - drops all metadata, incl. GPS location that phone photos carry
    - can't carry anything but pixels (no polyglot/script payloads)
    - shrinks phone photos to a web-friendly size
    """
    try:
        with Image.open(io.BytesIO(data)) as probe:
            if probe.format not in PHOTO_FORMATS:
                raise MediaError("Photos must be JPEG, PNG or WebP.")
            probe.verify()  # structural check; the object is unusable afterwards
        # Rotating/resizing/encoding decodes every pixel, so a truncated or
        # corrupt file fails here (OSError) even if verify() passed.
        with Image.open(io.BytesIO(data)) as image:
            # Apply the camera's rotation tag before metadata is dropped.
            image = ImageOps.exif_transpose(image)
            image.thumbnail((MAX_PHOTO_SIDE, MAX_PHOTO_SIDE))
            if image.mode not in ("RGB", "RGBA"):
                image = image.convert("RGBA" if "A" in image.getbands() else "RGB")
            out = io.BytesIO()
            image.save(out, "WEBP", quality=85)
            return out.getvalue(), image.width, image.height
    except MediaError:
        raise
    except (UnidentifiedImageError, OSError, SyntaxError, Image.DecompressionBombError) as e:
        raise MediaError("That file isn't a valid image.") from e


def check_sound(data: bytes) -> tuple[str, str, float | None]:
    """Validate audio by content. Returns (extension, content_type, duration_s)."""
    kind = filetype.guess(data)
    if kind is None or kind.mime not in SOUND_TYPES:
        raise MediaError("Sounds must be MP3, OGG or WAV files.")
    try:
        # Must also parse as audio, not just start with the right bytes.
        audio = mutagen.File(io.BytesIO(data))
    except mutagen.MutagenError as e:
        raise MediaError("That file isn't a valid sound.") from e
    if audio is None or audio.info is None:
        raise MediaError("That file isn't a valid sound.")
    duration = getattr(audio.info, "length", None)
    return SOUND_TYPES[kind.mime], kind.mime, round(duration, 2) if duration else None
