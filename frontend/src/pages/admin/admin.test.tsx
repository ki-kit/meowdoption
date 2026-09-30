import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { AdminApplication } from "../../api/admin";
import type { Cat } from "../../api/cats";
import { makeCat } from "../../test/fixtures";
import { renderRoute } from "../../test/renderRoute";

type Call = { method: string; path: string; body?: unknown };

/**
 * Small stateful fake of the admin API: writes change the data, so the tests
 * see what the UI shows after it refetches (not just canned replies).
 */
function fakeBackend(seed: { cats: Cat[]; applications?: AdminApplication[] }) {
  const cats = [...seed.cats];
  const applications = [...(seed.applications ?? [])];
  const calls: Call[] = [];
  let loggedIn = true;

  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = new URL(String(input), "http://test");
    const path = url.pathname.replace("/api/v1", "");
    const method = init?.method ?? "GET";
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    calls.push({ method, path, body });
    const reply = (status: number, data?: unknown) =>
      new Response(data === undefined ? null : JSON.stringify(data), { status });

    if (path === "/auth/me") return loggedIn ? reply(200, { id: 1, email: "admin@meow.test" }) : reply(401, {});
    if (!loggedIn) return reply(401, { detail: "Not authenticated" });

    if (path === "/applications" && method === "GET") {
      const status = url.searchParams.get("status");
      const catId = Number(url.searchParams.get("cat_id")) || undefined;
      const items = applications.filter(
        (a) => (!status || a.status === status) && (!catId || a.cat.id === catId),
      );
      return reply(200, { items, total: items.length, page: 1, size: 20 });
    }
    const appMatch = path.match(/^\/applications\/(\d+)$/);
    if (appMatch && method === "PATCH") {
      const app = applications.find((a) => a.id === Number(appMatch[1]))!;
      const cat = cats.find((c) => c.id === app.cat.id)!;
      if (body.status === "approved") {
        if (cat.status === "adopted") return reply(409, { detail: `${cat.name} has already been adopted.` });
        cat.status = "adopted";
        for (const other of applications) {
          if (other.cat.id === cat.id && other.id !== app.id && other.status === "new") other.status = "rejected";
        }
      } else if (app.status === "approved") {
        cat.status = "available";
      }
      app.status = body.status;
      for (const a of applications) if (a.cat.id === cat.id) a.cat = { ...a.cat, status: cat.status };
      return reply(200, app);
    }

    if (path === "/cats" && method === "GET") return reply(200, { items: cats, total: cats.length, page: 1, size: 12 });
    if (path === "/cats" && method === "POST") {
      const cat = makeCat(body);
      cats.push(cat);
      return reply(201, cat);
    }
    const catMatch = path.match(/^\/cats\/(\d+)$/);
    if (catMatch) {
      const index = cats.findIndex((c) => c.id === Number(catMatch[1]));
      if (index < 0) return reply(404, { detail: "Cat not found" });
      if (method === "GET") return reply(200, cats[index]);
      if (method === "PATCH") {
        cats[index] = { ...cats[index], ...body };
        return reply(200, cats[index]);
      }
      if (method === "DELETE") {
        cats.splice(index, 1);
        return reply(204);
      }
    }
    return reply(404, {});
  });

  return {
    calls,
    cats,
    applications,
    expireSession: () => {
      loggedIn = false;
    },
  };
}

let nextAppId = 1;
function makeApplication(cat: Cat, overrides: Partial<AdminApplication> = {}): AdminApplication {
  return {
    id: nextAppId++,
    cat: { id: cat.id, name: cat.name, status: cat.status },
    full_name: "Applicant",
    email: "applicant@example.com",
    phone: "",
    message: "",
    housing_type: "apartment",
    has_other_pets: false,
    status: "new",
    created_at: "2026-09-01T10:00:00",
    ...overrides,
  };
}

const card = (name: string) => screen.findByRole("article", { name: new RegExp(`^Application from ${name}`) });

describe("admin applications", () => {
  afterEach(() => vi.restoreAllMocks());

  it("opens on the inbox of new applications", async () => {
    const luna = makeCat({ name: "Luna" });
    fakeBackend({
      cats: [luna],
      applications: [
        makeApplication(luna, { full_name: "Jana", email: "jana@example.com", message: "Quiet flat." }),
        makeApplication(luna, { full_name: "Old", status: "rejected" }),
      ],
    });
    const { router } = renderRoute("/admin");

    const jana = await card("Jana");
    expect(router.state.location.pathname).toBe("/admin/applications");
    expect(within(jana).getByRole("link", { name: "jana@example.com" })).toHaveAttribute("href", "mailto:jana@example.com");
    expect(within(jana).getByText("Quiet flat.")).toBeInTheDocument();
    expect(screen.queryByRole("article", { name: /^Application from Old/ })).not.toBeInTheDocument();
  });

  it("approves after confirmation: cat adopted, other applicants rejected", async () => {
    const luna = makeCat({ name: "Luna" });
    const api = fakeBackend({
      cats: [luna],
      applications: [
        makeApplication(luna, { full_name: "Jana" }),
        makeApplication(luna, { full_name: "Petr" }),
      ],
    });
    renderRoute("/admin/applications");
    const user = userEvent.setup();

    await user.click(within(await card("Jana")).getByRole("button", { name: "Approve" }));
    // Nothing is sent until confirmed, and the side effects are spelled out.
    expect(api.calls.some((c) => c.method === "PATCH")).toBe(false);
    expect(screen.getByText(/Luna will be marked adopted and other open applications/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm approval" }));

    // Both leave the "New" inbox after the refetch.
    await waitFor(() => expect(screen.queryByRole("article")).not.toBeInTheDocument());
    expect(api.calls.find((c) => c.method === "PATCH")).toMatchObject({ body: { status: "approved" } });
    expect(api.cats[0].status).toBe("adopted");

    await user.click(screen.getByRole("tab", { name: "Rejected" }));
    expect(await card("Petr")).toBeInTheDocument();
  });

  it("can cancel an approval before confirming", async () => {
    const luna = makeCat({ name: "Luna" });
    const api = fakeBackend({ cats: [luna], applications: [makeApplication(luna, { full_name: "Jana" })] });
    renderRoute("/admin/applications");
    const user = userEvent.setup();

    await user.click(within(await card("Jana")).getByRole("button", { name: "Approve" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(api.calls.some((c) => c.method === "PATCH")).toBe(false);
  });

  it("undoes an approval, making the cat available again", async () => {
    const luna = makeCat({ name: "Luna", status: "adopted" });
    const api = fakeBackend({
      cats: [luna],
      applications: [makeApplication(luna, { full_name: "Jana", status: "approved" })],
    });
    renderRoute("/admin/applications?status=approved");
    const user = userEvent.setup();

    await user.click(within(await card("Jana")).getByRole("button", { name: "Undo approval" }));
    await user.click(screen.getByRole("button", { name: "Confirm undo" }));

    await waitFor(() => expect(api.cats[0].status).toBe("available"));
    expect(api.applications[0].status).toBe("rejected");
  });

  it("shows the server's reason when a change is refused", async () => {
    const luna = makeCat({ name: "Luna" });
    // Another admin adopted Luna meanwhile; our page still shows her available.
    const api = fakeBackend({ cats: [luna], applications: [makeApplication(luna, { full_name: "Petr" })] });
    api.cats[0] = { ...luna, status: "adopted" };
    renderRoute("/admin/applications");
    const user = userEvent.setup();

    await user.click(within(await card("Petr")).getByRole("button", { name: "Approve" }));
    await user.click(screen.getByRole("button", { name: "Confirm approval" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Luna has already been adopted.");
  });

  it("reopens and rejects", async () => {
    const luna = makeCat({ name: "Luna" });
    const api = fakeBackend({
      cats: [luna],
      applications: [makeApplication(luna, { full_name: "Petr", status: "rejected" })],
    });
    renderRoute("/admin/applications?status=all");
    const user = userEvent.setup();

    await user.click(within(await card("Petr")).getByRole("button", { name: "Reopen" }));
    await waitFor(() => expect(api.applications[0].status).toBe("new"));
    await user.click(within(await card("Petr")).getByRole("button", { name: "Reject" }));
    await waitFor(() => expect(api.applications[0].status).toBe("rejected"));
  });

  it("filters by cat from the URL", async () => {
    const luna = makeCat({ name: "Luna" });
    const micka = makeCat({ name: "Micka" });
    fakeBackend({
      cats: [luna, micka],
      applications: [makeApplication(luna, { full_name: "Jana" }), makeApplication(micka, { full_name: "Eva" })],
    });
    renderRoute(`/admin/applications?cat_id=${micka.id}`);

    expect(await card("Eva")).toBeInTheDocument();
    expect(screen.queryByRole("article", { name: /^Application from Jana/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Only for Micka/)).toBeInTheDocument();
  });

  it("sends the admin to the login page when the session expires", async () => {
    const luna = makeCat({ name: "Luna" });
    const api = fakeBackend({ cats: [luna], applications: [makeApplication(luna, { full_name: "Jana" })] });
    const { router } = renderRoute("/admin/applications");
    const user = userEvent.setup();

    await card("Jana");
    api.expireSession();
    await user.click(within(await card("Jana")).getByRole("button", { name: "Reject" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/admin/login"));
  });
});

describe("admin cats", () => {
  afterEach(() => vi.restoreAllMocks());

  it("adds a cat after validating the form", async () => {
    const api = fakeBackend({ cats: [] });
    const { router } = renderRoute("/admin/cats");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("link", { name: "Add cat" }));
    await user.click(await screen.findByRole("button", { name: "Add cat" }));
    expect(await screen.findByText("Please enter a name")).toBeInTheDocument();
    expect(screen.getByText("Please choose the sex")).toBeInTheDocument();
    expect(screen.getByText("Please enter the age in months")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Name"), "Tom");
    await user.selectOptions(screen.getByLabelText("Sex"), "Male");
    await user.type(screen.getByLabelText("Age (months)"), "14");
    expect(screen.getByText("= 1 year")).toBeInTheDocument();
    await user.click(screen.getByLabelText("Castrated"));
    await user.click(screen.getByRole("button", { name: "Add cat" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/admin/cats"));
    expect(await screen.findByRole("row", { name: "Tom" })).toBeInTheDocument();
    expect(api.calls.find((c) => c.method === "POST")?.body).toMatchObject({
      name: "Tom",
      sex: "male",
      age_months: 14,
      castrated: true,
      status: "available",
    });
  });

  it("edits a cat, sending only the changed fields", async () => {
    const micka = makeCat({ name: "Micka", castrated: false, breed: "Siamese" });
    const api = fakeBackend({ cats: [micka] });
    renderRoute(`/admin/cats/${micka.id}/edit`);
    const user = userEvent.setup();

    expect(await screen.findByLabelText("Breed")).toHaveValue("Siamese");
    await user.click(screen.getByLabelText("Castrated"));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(api.calls.some((c) => c.method === "PATCH")).toBe(true));
    expect(api.calls.find((c) => c.method === "PATCH")).toEqual({
      method: "PATCH",
      path: `/cats/${micka.id}`,
      body: { castrated: true },
    });
  });

  it("deletes a cat only after confirmation", async () => {
    const tom = makeCat({ name: "Tom" });
    const api = fakeBackend({ cats: [tom] });
    renderRoute("/admin/cats");
    const user = userEvent.setup();

    const row = await screen.findByRole("row", { name: "Tom" });
    await user.click(within(row).getByRole("button", { name: "Delete" }));
    expect(within(row).getByText("This also deletes all of its applications.")).toBeInTheDocument();
    await user.click(within(row).getByRole("button", { name: "Delete Tom" }));

    await waitFor(() => expect(screen.queryByRole("row", { name: "Tom" })).not.toBeInTheDocument());
    expect(api.cats).toHaveLength(0);
  });

  it("links each cat to its applications", async () => {
    const tom = makeCat({ name: "Tom" });
    fakeBackend({ cats: [tom] });
    renderRoute("/admin/cats");

    const row = await screen.findByRole("row", { name: "Tom" });
    expect(within(row).getByRole("link", { name: "Applications" })).toHaveAttribute(
      "href",
      `/admin/applications?status=all&cat_id=${tom.id}`,
    );
  });
});
