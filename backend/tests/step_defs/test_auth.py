import re
from datetime import timedelta

import jwt
from pytest_bdd import given, parsers, scenarios, then, when
from sqlalchemy import select

from app.models import AdminUser
from app.security import ALGORITHM, COOKIE_NAME, create_access_token
from app.services.admins import create_admin

scenarios("auth.feature")


def _login(client, email, password):
    # OAuth2 password flow: form-encoded, email goes in "username".
    return client.post("/api/v1/auth/login", data={"username": email, "password": password})


def _set_cookies(response) -> list[str]:
    return response.headers.get_list("set-cookie")


# --- Given ------------------------------------------------------------------


@given(parsers.parse('an admin "{email}" with password "{password}"'))
def an_admin(db_session, email, password):
    create_admin(db_session, email, password)


@given(parsers.parse('the admin "{email}" is deactivated'))
def deactivate(db_session, email):
    admin = db_session.scalars(select(AdminUser).where(AdminUser.email == email)).one()
    admin.is_active = False
    db_session.commit()


@given(parsers.parse('I am logged in as "{email}" with password "{password}"'))
def logged_in(client, email, password):
    # TestClient keeps cookies like a browser, so later requests carry it.
    assert _login(client, email, password).status_code == 200


@given(parsers.parse('I have a bearer token for "{email}" with password "{password}"'))
def bearer_token(client, ctx, email, password):
    ctx["token"] = _login(client, email, password).json()["access_token"]
    client.cookies.clear()  # prove the header alone is enough


# --- When -------------------------------------------------------------------


@when(parsers.parse('I log in as "{email}" with password "{password}"'))
def log_in(client, ctx, email, password):
    ctx["response"] = _login(client, email, password)


@when("I ask who I am")
def who_am_i(client, ctx):
    ctx["response"] = client.get("/api/v1/auth/me")


@when("I ask who I am using the bearer token")
def who_am_i_bearer(client, ctx):
    ctx["response"] = client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {ctx['token']}"}
    )


@when(parsers.parse("I ask who I am with a {kind} token"))
def who_am_i_bad_token(client, ctx, db_session, kind):
    admin_id = db_session.scalars(select(AdminUser.id)).first()
    token = {
        "garbage": lambda: "not.a.jwt",
        "expired": lambda: create_access_token(admin_id, expires_in=timedelta(seconds=-1)),
        "foreign-signed": lambda: jwt.encode(
            {"sub": str(admin_id), "exp": 9999999999}, "someone-elses-secret-that-is-long-enough", ALGORITHM
        ),
        "unknown-admin": lambda: create_access_token(999999),
    }[kind]()
    ctx["response"] = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})


@when("I log out")
def log_out(client, ctx):
    ctx["response"] = client.post("/api/v1/auth/logout")


# --- Then -------------------------------------------------------------------


@then("I receive a bearer token")
def receive_token(ctx):
    body = ctx["response"].json()
    assert body["token_type"] == "bearer"
    assert body["access_token"].count(".") == 2  # header.payload.signature


@then(parsers.parse('an httpOnly SameSite=strict auth cookie is set for "{path}"'))
def auth_cookie_set(ctx, path):
    cookies = [c for c in _set_cookies(ctx["response"]) if c.startswith(f"{COOKIE_NAME}=")]
    assert len(cookies) == 1, cookies
    attrs = {a.strip().lower() for a in cookies[0].split(";")}
    assert "httponly" in attrs
    assert "samesite=strict" in attrs
    assert f"path={path}" in attrs


@then("no auth cookie is set")
def no_auth_cookie(ctx):
    assert not any(c.startswith(COOKIE_NAME) for c in _set_cookies(ctx["response"]))


@then(parsers.parse('the error message is "{message}"'))
def error_message(ctx, message):
    assert ctx["response"].json()["detail"] == message


@then(parsers.parse('I am "{email}"'))
def i_am(ctx, email):
    assert ctx["response"].json()["email"] == email


@then(parsers.parse("when I ask who I am the response status is {code:d}"))
def who_am_i_status(client, code):
    assert client.get("/api/v1/auth/me").status_code == code


def _operations(client) -> dict[tuple[str, str], dict]:
    """Every API operation from the OpenAPI schema. FastAPI marks operations
    that depend on require_admin (via OAuth2PasswordBearer) with "security"."""
    paths = client.get("/openapi.json").json()["paths"]
    return {
        (method.upper(), path): operation
        for path, operations in paths.items()
        for method, operation in operations.items()
    }


@then("every route that requires an admin answers 401 without credentials")
def admin_routes_reject_anonymous(client):
    # Discovered, not listed by hand: new admin routes are covered automatically.
    protected = [key for key, op in _operations(client).items() if op.get("security")]
    assert protected, "no admin routes found; is the discovery broken?"

    client.cookies.clear()
    for method, path in protected:
        url = re.sub(r"\{[^}]+\}", "1", path)
        response = client.request(method, url)
        assert response.status_code == 401, f"{method} {path} -> {response.status_code}"


@then("every route except these requires an admin:")
def only_allowlisted_routes_are_public(client, datatable):
    # Secure by default: a new route must either require an admin or be added
    # to this list on purpose. Forgetting require_admin fails here.
    _, *rows = datatable
    public = {(method.strip(), path.strip()) for method, path in rows}
    operations = _operations(client)

    assert public <= operations.keys(), f"allowlist has stale entries: {public - operations.keys()}"
    unprotected = {key for key, op in operations.items() if not op.get("security")}
    assert unprotected == public, f"unexpected public routes: {unprotected - public}"
