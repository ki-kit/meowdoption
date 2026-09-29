from pytest_bdd import given, parsers, scenarios, then, when
from sqlalchemy import select

from app.models import Application, Cat, HousingType

scenarios("applications.feature")


def _cat(db_session, name: str) -> Cat:
    return db_session.scalars(select(Cat).where(Cat.name == name)).one()


def _form(datatable) -> dict:
    """First data row as a JSON body; empty cells stay "" (tests blank input)."""
    header, row = datatable
    body = dict(zip(header, row))
    if "has_other_pets" in body:
        body["has_other_pets"] = body["has_other_pets"].lower() == "true"
    return body


@given(parsers.parse('"{email}" already applied for "{name}"'))
def already_applied(db_session, email, name):
    db_session.add(
        Application(
            cat_id=_cat(db_session, name).id,
            full_name="Earlier Applicant",
            email=email,
            housing_type=HousingType.apartment,
        )
    )
    db_session.commit()


@when(parsers.parse('I apply for "{name}" with:'))
def apply_for(client, ctx, db_session, name, datatable):
    cat = _cat(db_session, name)
    ctx["response"] = client.post(f"/api/v1/cats/{cat.id}/applications", json=_form(datatable))


@when("I apply for a cat that does not exist")
def apply_for_missing(client, ctx):
    body = {"full_name": "X", "email": "x@example.com", "housing_type": "apartment"}
    ctx["response"] = client.post("/api/v1/cats/999999/applications", json=body)


@then(parsers.parse('the application status is "{status}"'))
def application_status(ctx, status):
    assert ctx["response"].json()["status"] == status


@then(parsers.parse('the response has only "{fields}"'))
def response_fields(ctx, fields):
    assert set(ctx["response"].json()) == {f.strip() for f in fields.split(",")}


@then(parsers.parse('the error is about "{field}"'))
def error_about(ctx, field):
    # FastAPI 422 body: {"detail": [{"loc": ["body", "<field>"], ...}, ...]}
    fields = {err["loc"][-1] for err in ctx["response"].json()["detail"]}
    assert field in fields, fields


@then(parsers.re(r'"(?P<name>[^"]+)" has (?P<count>\d+) applications?$'))
def application_count(db_session, name, count):
    db_session.expire_all()  # the API wrote through its own session
    assert len(_cat(db_session, name).applications) == int(count)


@then(parsers.parse('"{name}" has 1 application from "{email}"'))
def application_from(db_session, name, email):
    db_session.expire_all()
    apps = _cat(db_session, name).applications
    assert [a.email for a in apps] == [email]
