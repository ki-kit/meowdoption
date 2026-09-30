from pytest_bdd import parsers, scenarios, then, when
from sqlalchemy import func, select

from app.models import Application, Cat

scenarios("admin_cats.feature")

INT_FIELDS = {"age_months"}
BOOL_FIELDS = {"castrated", "good_with_kids", "good_with_cats", "good_with_dogs"}


def _body(datatable) -> dict:
    """First data row as JSON. Numbers that don't parse are sent as-is (422 tests)."""
    header, row = datatable
    body = {}
    for field, raw in zip(header, row):
        if field in BOOL_FIELDS:
            body[field] = raw.lower() == "true"
        elif field in INT_FIELDS and raw.lstrip("-").isdigit():
            body[field] = int(raw)
        else:
            body[field] = raw
    return body


def _cat_id(db_session, name: str) -> int:
    return db_session.scalars(select(Cat.id).where(Cat.name == name)).one()


@when("I add the cat:")
def add_cat(client, ctx, datatable):
    ctx["response"] = client.post("/api/v1/cats", json=_body(datatable))


@when(parsers.parse('I change "{name}" to:'))
def change_cat(client, ctx, db_session, name, datatable):
    cat_id = _cat_id(db_session, name)
    ctx["response"] = client.patch(f"/api/v1/cats/{cat_id}", json=_body(datatable))


@when(parsers.parse("I change cat {cat_id:d} to:"))
def change_cat_by_id(client, ctx, cat_id, datatable):
    ctx["response"] = client.patch(f"/api/v1/cats/{cat_id}", json=_body(datatable))


@when(parsers.parse('I clear the name of "{name}"'))
def clear_name(client, ctx, db_session, name):
    cat_id = _cat_id(db_session, name)
    ctx["response"] = client.patch(f"/api/v1/cats/{cat_id}", json={"name": None})


@when(parsers.parse('I delete "{name}"'))
def delete_cat(client, ctx, db_session, name):
    ctx["cat_id"] = _cat_id(db_session, name)
    ctx["response"] = client.delete(f"/api/v1/cats/{ctx['cat_id']}")


@when(parsers.parse("I delete cat {cat_id:d}"))
def delete_cat_by_id(client, ctx, cat_id):
    ctx["response"] = client.delete(f"/api/v1/cats/{cat_id}")


@then(parsers.parse('the cat "{name}" is listed publicly as "{status}" and castrated'))
def listed_publicly(client, name, status):
    client.cookies.clear()  # as an anonymous visitor
    cats = client.get("/api/v1/cats").json()["items"]
    cat = next(c for c in cats if c["name"] == name)
    assert cat["status"] == status
    assert cat["castrated"] is True


@then(parsers.parse('"{name}" is castrated'))
def is_castrated(ctx, name):
    assert ctx["response"].json()["castrated"] is True


@then(parsers.parse('"{name}" still has breed "{breed}" and age {age:d}'))
def unchanged_fields(ctx, name, breed, age):
    body = ctx["response"].json()
    assert (body["name"], body["breed"], body["age_months"]) == (name, breed, age)


@then(parsers.parse('"{name}" is gone'))
def is_gone(client, ctx, name):
    assert client.get(f"/api/v1/cats/{ctx['cat_id']}").status_code == 404


@then(parsers.parse("there are {count:d} applications in total"))
def applications_total(db_session, count):
    db_session.expire_all()
    assert db_session.scalar(select(func.count(Application.id))) == count
