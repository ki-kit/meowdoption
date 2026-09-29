from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from pytest_bdd import given, parsers, scenarios, then, when

from app.config import get_settings
from app.main import app
from app.security import COOKIE_NAME
from app.services import login_limits
from app.services.admins import create_admin

scenarios("login_rate_limit.feature")


@pytest.fixture(autouse=True)
def limits(monkeypatch):
    """Pin the limits the scenarios talk about (5 per account, 20 per IP,
    15 minutes). The dev container raises the per-IP limit via env, and the
    tests must not depend on where they run."""
    settings = get_settings()
    monkeypatch.setattr(settings, "login_window_minutes", 15)
    monkeypatch.setattr(settings, "login_max_failures_per_account", 5)
    monkeypatch.setattr(settings, "login_max_failures_per_ip", 20)


@pytest.fixture
def clock(monkeypatch):
    """Lets steps move time forward instead of waiting 15 minutes."""
    state = {"offset": timedelta()}
    real = login_limits.utcnow
    monkeypatch.setattr(login_limits, "utcnow", lambda: real() + state["offset"])
    return state


@pytest.fixture
def from_ip(client):
    """A client that appears to connect from a given IP. Depends on `client`
    so the test DB/storage overrides are active."""
    return lambda ip: TestClient(app, client=(ip, 50000))


def _login(http, email, password):
    return http.post("/api/v1/auth/login", data={"username": email, "password": password})


@given(parsers.parse('an admin "{email}" with password "{password}"'))
def an_admin(db_session, email, password):
    create_admin(db_session, email, password)


@given(parsers.parse('{count:d} failed logins for "{email}" from {ip}'))
def failed_logins(from_ip, count, email, ip):
    http = from_ip(ip)
    for _ in range(count):
        assert _login(http, email, "wrong-password").status_code == 401


@given(parsers.parse("{count:d} failed logins for different emails from {ip}"))
def failed_logins_many_accounts(from_ip, count, ip):
    http = from_ip(ip)
    for i in range(count):
        assert _login(http, f"user{i}@meow.test", "wrong-password").status_code == 401


@when(parsers.parse('I log in as "{email}" with password "{password}" from {ip}'))
def log_in_from(from_ip, ctx, email, password, ip):
    ctx["response"] = _login(from_ip(ip), email, password)


@when(parsers.parse("{minutes:d} minutes pass"))
def time_passes(clock, minutes):
    clock["offset"] += timedelta(minutes=minutes)


@then(parsers.parse("the response says to retry in about {minutes:d} minutes"))
def retry_message(ctx, minutes):
    response = ctx["response"]
    assert f"Try again in {minutes} minutes" in response.json()["detail"]
    assert abs(int(response.headers["Retry-After"]) - minutes * 60) <= 5


@then("no auth cookie is set")
def no_cookie(ctx):
    assert not any(c.startswith(COOKIE_NAME) for c in ctx["response"].headers.get_list("set-cookie"))


@then(parsers.parse('{count:d} more wrong passwords from {ip} are needed before "{email}" is blocked'))
def budget_restored(from_ip, count, ip, email):
    http = from_ip(ip)
    for _ in range(count):
        assert _login(http, email, "wrong-password").status_code == 401
    assert _login(http, email, "wrong-password").status_code == 429


@then(parsers.parse("only {count:d} recorded login failure remains"))
def failures_left(db_session, count):
    assert login_limits.failure_count(db_session) == count
