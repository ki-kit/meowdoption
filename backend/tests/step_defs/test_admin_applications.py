from urllib.parse import parse_qsl, urlencode

from pytest_bdd import given, parsers, scenarios, then, when
from sqlalchemy import select

from app.models import Application, Cat

scenarios("admin_applications.feature")


def _cat(db_session, name: str) -> Cat:
    return db_session.scalars(select(Cat).where(Cat.name == name)).one()


def _application(db_session, email: str, cat_name: str) -> Application:
    db_session.expire_all()  # the API wrote through its own session
    return db_session.scalars(
        select(Application).where(
            Application.email == email, Application.cat_id == _cat(db_session, cat_name).id
        )
    ).one()


def _set_status(client, application_id: int, status: str):
    return client.patch(f"/api/v1/applications/{application_id}", json={"status": status})


@given(parsers.parse('the application from "{email}" for "{cat}" was approved'))
def was_approved(client, db_session, email, cat):
    response = _set_status(client, _application(db_session, email, cat).id, "approved")
    assert response.status_code == 200, response.text


@when("I list applications")
def list_applications(client, ctx):
    ctx["response"] = client.get("/api/v1/applications")


@when(parsers.parse('I list applications with "{query}"'))
def list_applications_filtered(client, ctx, db_session, query):
    # Feature files use cat names; the API wants ids.
    params = [
        (k, _cat(db_session, v).id if k == "cat_id" else v) for k, v in parse_qsl(query)
    ]
    ctx["response"] = client.get(f"/api/v1/applications?{urlencode(params)}")


@when(parsers.parse('I set the application from "{email}" for "{cat}" to "{status}"'))
def set_status(client, ctx, db_session, email, cat, status):
    ctx["response"] = _set_status(client, _application(db_session, email, cat).id, status)


@when(parsers.parse('I set application {application_id:d} to "{status}"'))
def set_status_by_id(client, ctx, application_id, status):
    ctx["response"] = _set_status(client, application_id, status)


@when(parsers.parse('a visitor applies for "{cat}"'))
def visitor_applies(client, ctx, db_session, cat):
    client.cookies.clear()
    body = {"full_name": "Late Visitor", "email": "late@example.com", "housing_type": "house"}
    ctx["response"] = client.post(f"/api/v1/cats/{_cat(db_session, cat).id}/applications", json=body)


@then(parsers.parse('I see applications from "{emails}" in that order'))
def see_in_order(ctx, emails):
    expected = [e.strip() for e in emails.split(",")]
    assert [a["email"] for a in ctx["response"].json()["items"]] == expected


@then("each application shows its cat's name")
def shows_cat_name(ctx):
    names = {a["email"]: a["cat"]["name"] for a in ctx["response"].json()["items"]}
    assert names == {"jana@example.com": "Luna", "petr@example.com": "Luna", "eva@example.com": "Micka"}


@then(parsers.parse('"{cat}" is "{status}"'))
def cat_status(db_session, cat, status):
    db_session.expire_all()
    assert _cat(db_session, cat).status == status


@then(parsers.parse('the application from "{email}" for "{cat}" is "{status}"'))
def application_status(db_session, email, cat, status):
    assert _application(db_session, email, cat).status == status
