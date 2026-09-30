import io
import struct
import wave

from PIL import Image
from pytest_bdd import given, parsers, scenarios, then, when
from sqlalchemy import select

from app.models import Cat, CatPhoto, CatSound

scenarios("media.feature")


# --- Test files, generated in code (no binary fixtures in the repo) -----------


def png(width: int = 40, height: int = 30) -> bytes:
    out = io.BytesIO()
    Image.new("RGB", (width, height), (200, 120, 40)).save(out, "PNG")
    return out.getvalue()


def jpeg(width: int = 40, height: int = 30, exif: Image.Exif | None = None) -> bytes:
    out = io.BytesIO()
    Image.new("RGB", (width, height), (90, 90, 90)).save(out, "JPEG", exif=exif or Image.Exif())
    return out.getvalue()


def wav(seconds: float) -> bytes:
    rate = 8000
    out = io.BytesIO()
    with wave.open(out, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(struct.pack("<h", 0) * int(rate * seconds))
    return out.getvalue()


# --- Helpers --------------------------------------------------------------------


def _cat(db_session, name: str) -> Cat:
    db_session.expire_all()  # the API wrote through its own session
    return db_session.scalars(select(Cat).where(Cat.name == name)).one()


def _upload(client, cat_id: int, kind: str, filename: str, data: bytes, mime: str):
    return client.post(f"/api/v1/cats/{cat_id}/{kind}", files={"file": (filename, data, mime)})


def _public_cat(client, cat_id: int) -> dict:
    return client.get(f"/api/v1/cats/{cat_id}").json()


# --- Given ------------------------------------------------------------------------


@given(parsers.parse('"{name}" has {count:d} photos'))
def has_photos(client, db_session, ctx, name, count):
    cat_id = _cat(db_session, name).id
    ctx["photos"] = [
        _upload(client, cat_id, "photos", f"p{i}.png", png(), "image/png").json() for i in range(count)
    ]


@given(parsers.parse('"{name}" has {count:d} sounds'))
def has_sounds(client, db_session, ctx, name, count):
    cat_id = _cat(db_session, name).id
    ctx["sounds"] = [
        _upload(client, cat_id, "sounds", f"s{i}.wav", wav(0.2), "audio/wav").json() for i in range(count)
    ]


# --- When: photos -----------------------------------------------------------------


@when(parsers.parse('I upload a {w:d}x{h:d} PNG photo for "{name}"'))
def upload_sized_png(client, ctx, db_session, w, h, name):
    ctx["cat_id"] = _cat(db_session, name).id
    ctx["response"] = _upload(client, ctx["cat_id"], "photos", "cat.png", png(w, h), "image/png")


@when(parsers.parse('I upload a JPEG photo with GPS metadata for "{name}"'))
def upload_gps_jpeg(client, ctx, db_session, name):
    exif = Image.Exif()
    exif[0x010F] = "PhoneMaker"  # Make
    exif[0x8825] = {1: "N", 2: (50.0, 5.0, 12.0), 3: "E", 4: (14.0, 25.0, 1.0)}  # GPS IFD
    data = jpeg(exif=exif)
    assert Image.open(io.BytesIO(data)).getexif().get_ifd(0x8825), "test photo should carry GPS"
    ctx["response"] = _upload(client, _cat(db_session, name).id, "photos", "gps.jpg", data, "image/jpeg")


@when(parsers.parse('I upload a {w:d}x{h:d} JPEG photo tagged "rotate 90°" for "{name}"'))
def upload_rotated_jpeg(client, ctx, db_session, w, h, name):
    exif = Image.Exif()
    exif[0x0112] = 6  # Orientation: rotate 90° clockwise to display
    data = jpeg(w, h, exif)
    ctx["response"] = _upload(client, _cat(db_session, name).id, "photos", "r.jpg", data, "image/jpeg")


BAD_PHOTOS = {
    'a text file named "cat.png"': ("cat.png", b"just some text, not an image", "image/png"),
    "a truncated PNG": ("cat.png", png(400, 300)[:200], "image/png"),
    "an SVG image": (
        "cat.svg",
        b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
        "image/svg+xml",
    ),
}


@when(parsers.parse('I upload {file} as a photo for "{name}"'))
def upload_bad_photo(client, ctx, db_session, file, name):
    filename, data, mime = BAD_PHOTOS[file]
    ctx["response"] = _upload(client, _cat(db_session, name).id, "photos", filename, data, mime)


@when(parsers.parse('I upload a photo larger than 5 MB for "{name}"'))
def upload_huge_photo(client, ctx, db_session, name):
    data = b"\x89PNG" + b"\0" * (5 * 1024 * 1024)
    ctx["response"] = _upload(client, _cat(db_session, name).id, "photos", "big.png", data, "image/png")


@when(parsers.parse('I upload {count:d} photos for "{name}"'))
def upload_photos(client, ctx, db_session, count, name):
    cat_id = _cat(db_session, name).id
    for i in range(count):
        ctx["response"] = _upload(client, cat_id, "photos", f"n{i}.png", png(), "image/png")


@when(parsers.parse("I upload {count:d} photos for cat {cat_id:d}"))
def upload_photos_unknown_cat(client, ctx, count, cat_id):
    ctx["response"] = _upload(client, cat_id, "photos", "x.png", png(), "image/png")


@when("I make the second photo primary")
def second_photo_primary(client, ctx):
    ctx["response"] = client.patch(f"/api/v1/photos/{ctx['photos'][1]['id']}", json={"is_primary": True})


@when("I delete the first photo")
def delete_first_photo(client, ctx):
    ctx["response"] = client.delete(f"/api/v1/photos/{ctx['photos'][0]['id']}")


# --- When: sounds -----------------------------------------------------------------


@when(parsers.parse('I upload a {seconds:f} second WAV meow for "{name}"'))
def upload_wav(client, ctx, db_session, seconds, name):
    ctx["response"] = _upload(client, _cat(db_session, name).id, "sounds", "meow.wav", wav(seconds), "audio/wav")


@when(parsers.parse('I upload an executable renamed to "{filename}" as a sound for "{name}"'))
def upload_exe(client, ctx, db_session, filename, name):
    exe = b"MZ\x90\x00\x03\x00\x00\x00\x04\x00" + b"\0" * 500  # DOS/Windows executable header
    ctx["response"] = _upload(client, _cat(db_session, name).id, "sounds", filename, exe, "audio/mpeg")


@when(parsers.parse('I upload a sound larger than 1 MB for "{name}"'))
def upload_huge_sound(client, ctx, db_session, name):
    data = wav(0.1) + b"\0" * (1024 * 1024)
    ctx["response"] = _upload(client, _cat(db_session, name).id, "sounds", "big.wav", data, "audio/wav")


@when("I make the second sound primary")
def second_sound_primary(client, ctx):
    ctx["response"] = client.patch(f"/api/v1/sounds/{ctx['sounds'][1]['id']}", json={"is_primary": True})


@when("I delete the first sound")
def delete_first_sound(client, ctx):
    ctx["response"] = client.delete(f"/api/v1/sounds/{ctx['sounds'][0]['id']}")


@when(parsers.parse('I delete "{name}"'))
def delete_cat(client, ctx, db_session, name):
    ctx["response"] = client.delete(f"/api/v1/cats/{_cat(db_session, name).id}")


# --- Then -------------------------------------------------------------------------


def _stored_image(db_session, media_storage) -> Image.Image:
    db_session.expire_all()
    photo = db_session.scalars(select(CatPhoto)).one()
    return Image.open(media_storage.path(photo.filename))


@then(parsers.parse("the photo is stored as WebP no larger than {side:d} pixels"))
def stored_as_webp(db_session, media_storage, side):
    image = _stored_image(db_session, media_storage)
    assert image.format == "WEBP"
    assert image.size == (side, side // 2)  # 2400x1200 scaled, aspect ratio kept


@then(parsers.parse('"{name}" shows that photo as primary publicly'))
def primary_photo_public(client, ctx, name):
    client.cookies.clear()  # as a visitor
    cat = _public_cat(client, ctx["cat_id"])
    assert cat["primary_photo_url"] == ctx["response"].json()["url"]
    assert cat["primary_photo_url"].startswith("/media/photos/")
    assert "filename" not in cat["photos"][0]  # storage internals aren't exposed


@then("the stored photo has no metadata")
def no_metadata(db_session, media_storage):
    image = _stored_image(db_session, media_storage)
    assert not image.getexif()
    assert "exif" not in image.info


@then(parsers.parse("the stored photo is {w:d}x{h:d}"))
def stored_size(db_session, media_storage, w, h):
    assert _stored_image(db_session, media_storage).size == (w, h)


@then(parsers.parse('"{name}" has no photos'))
def no_photos(db_session, media_storage, name):
    assert _cat(db_session, name).photos == []
    assert not any(media_storage.root.rglob("*.*"))  # nothing half-saved


@then(parsers.parse('"{name}" has no sounds'))
def no_sounds(db_session, name):
    assert _cat(db_session, name).sounds == []


@then(parsers.re(r'"(?P<name>[^"]+)" has (?P<count>\d+) photos and only the (?P<which>first|second) is primary'))
def only_one_primary(db_session, name, count, which):
    photos = _cat(db_session, name).photos
    assert len(photos) == int(count)
    assert [p.is_primary for p in photos] == [which == "first", which == "second"]


@then(parsers.parse('"{name}" has 1 photo and it is primary'))
def single_primary(db_session, name):
    photos = _cat(db_session, name).photos
    assert len(photos) == 1 and photos[0].is_primary


@then(parsers.re(r"the first (?P<kind>photo|sound)'s file is gone"))
def first_file_gone(ctx, media_storage, kind):
    url = ctx[f"{kind}s"][0]["url"]
    assert not media_storage.path(url.removeprefix("/media/")).exists()


@then(parsers.parse("the sound's duration is about {seconds:f} seconds"))
def sound_duration(ctx, seconds):
    assert abs(ctx["response"].json()["duration_s"] - seconds) < 0.05


@then(parsers.parse('visitors get the second sound as "{name}"\'s meow'))
def second_sound_is_meow(client, ctx, db_session, name):
    client.cookies.clear()
    cat = _public_cat(client, _cat(db_session, name).id)
    assert cat["primary_sound_url"] == ctx["sounds"][1]["url"]


@then(parsers.parse('visitors get the default meow for "{name}"'))
def default_meow(client, db_session, name):
    client.cookies.clear()
    cat = _public_cat(client, _cat(db_session, name).id)
    assert cat["primary_sound_url"] == "/media/default/meow.wav"
    # ...and that URL really serves audio.
    response = client.get(cat["primary_sound_url"])
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("audio/")
    assert response.headers["x-content-type-options"] == "nosniff"


@then("no media files are left")
def no_files_left(db_session, media_storage):
    assert not [p for p in media_storage.root.rglob("*") if p.is_file()]
    db_session.expire_all()
    assert db_session.scalars(select(CatPhoto)).all() == []
    assert db_session.scalars(select(CatSound)).all() == []
