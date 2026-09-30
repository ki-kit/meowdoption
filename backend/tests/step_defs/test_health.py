from pytest_bdd import parsers, scenarios, then, when

scenarios("health.feature")


@when("I request the health endpoint")
def request_health(client, ctx):
    ctx["response"] = client.get("/api/health")


@then(parsers.parse('the API reports status "{status}"'))
def api_status(ctx, status):
    assert ctx["response"].json()["status"] == status


@then("the database is reachable")
def database_reachable(ctx):
    assert ctx["response"].json()["database"] == "ok"
