from pytest_bdd import parsers, scenarios, then, when

from app.models import Cat

scenarios("browse_cats.feature")


@when("I list cats")
def list_cats(client, ctx):
    ctx["response"] = client.get("/api/v1/cats")


@when(parsers.parse('I list cats with "{query}"'))
def list_cats_filtered(client, ctx, query):
    ctx["response"] = client.get(f"/api/v1/cats?{query}")


@when(parsers.parse('I view the cat "{name}"'))
def view_cat(client, ctx, db_session, name):
    cat = db_session.query(Cat).filter_by(name=name).one()
    ctx["response"] = client.get(f"/api/v1/cats/{cat.id}")


@when(parsers.parse('I request "{path}"'))
def request_path(client, ctx, path):
    ctx["response"] = client.get(path)


@when("I view a cat that does not exist")
def view_missing_cat(client, ctx):
    ctx["response"] = client.get("/api/v1/cats/999999")


@then(parsers.parse("the total is {total:d}"))
def total_is(ctx, total):
    assert ctx["response"].json()["total"] == total


@then(parsers.parse('I see the cats "{names}"'))
def see_cats(ctx, names):
    # Compared as sets: the scenario cares *which* cats match, not the order.
    expected = {n.strip() for n in names.split(",")}
    got = {c["name"] for c in ctx["response"].json()["items"]}
    assert got == expected


@then(parsers.parse("I see {count:d} cat on the page"))
def cats_on_page(ctx, count):
    assert len(ctx["response"].json()["items"]) == count


@then(parsers.parse('the cat\'s breed is "{breed}"'))
def cat_breed(ctx, breed):
    assert ctx["response"].json()["breed"] == breed


@then("the cat is not castrated")
def cat_not_castrated(ctx):
    assert ctx["response"].json()["castrated"] is False
