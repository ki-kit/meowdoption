import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderRoute } from "../../test/renderRoute";

const ADMIN = { id: 1, email: "admin@meow.test" };
const PASSWORD = "correct horse battery";

/** Fake auth API with a session flag, like the httpOnly cookie would be. */
function authApi({ loggedIn = false } = {}) {
  let session = loggedIn;
  const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const path = new URL(String(input), "http://test").pathname;
    const json = (status: number, body: unknown) =>
      new Response(body === null ? null : JSON.stringify(body), { status });

    if (path === "/api/v1/auth/me") return session ? json(200, ADMIN) : json(401, { detail: "Not authenticated" });
    if (path === "/api/v1/auth/logout") {
      session = false;
      return json(204, null);
    }
    if (path === "/api/v1/auth/login") {
      const form = init?.body as URLSearchParams;
      session = form.get("username") === ADMIN.email && form.get("password") === PASSWORD;
      return session
        ? json(200, { access_token: "t", token_type: "bearer" })
        : json(401, { detail: "Incorrect email or password" });
    }
    return json(404, {});
  });
  return spy;
}

async function logIn(email: string, password: string) {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText("Email"), email);
  await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Log in" }));
}

describe("admin auth", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends anonymous visitors to the login page, remembering where they wanted to go", async () => {
    authApi();
    const { router } = renderRoute("/admin");

    expect(await screen.findByRole("heading", { name: "Admin login" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/admin/login");
    expect(router.state.location.search).toBe("?next=%2Fadmin");
  });

  it("logs in and continues to the requested page", async () => {
    const api = authApi();
    const { router } = renderRoute("/admin");

    await logIn(ADMIN.email, PASSWORD);

    expect(await screen.findByRole("heading", { name: "Applications", level: 1 })).toBeInTheDocument();
    expect(screen.getByText(`Signed in as ${ADMIN.email}`)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/admin/applications");
    // OAuth2 password flow: form-encoded, email in "username".
    const loginCall = api.mock.calls.find(([url]) => String(url).endsWith("/auth/login"))!;
    expect(String(loginCall[1]?.body)).toContain("username=admin%40meow.test");
  });

  it("shows an error for a wrong password", async () => {
    authApi();
    renderRoute("/admin/login");

    await logIn(ADMIN.email, "wrong");

    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password.");
    expect(screen.getByRole("heading", { name: "Admin login" })).toBeInTheDocument();
  });

  it("tells the admin how long to wait after too many failed attempts", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) =>
      String(input).endsWith("/auth/me")
        ? new Response(JSON.stringify({ detail: "Not authenticated" }), { status: 401 })
        : new Response(
            JSON.stringify({ detail: "Too many failed login attempts. Try again in 15 minutes." }),
            { status: 429, headers: { "Retry-After": "900" } },
          ),
    );
    renderRoute("/admin/login");

    await logIn(ADMIN.email, PASSWORD);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Too many failed login attempts. Try again in 15 minutes.",
    );
  });

  it("validates empty fields without calling the API", async () => {
    const api = authApi();
    renderRoute("/admin/login");

    await userEvent.click(await screen.findByRole("button", { name: "Log in" }));

    expect(await screen.findByText("Please enter your email")).toBeInTheDocument();
    expect(screen.getByText("Please enter your password")).toBeInTheDocument();
    expect(api.mock.calls.some(([url]) => String(url).endsWith("/auth/login"))).toBe(false);
  });

  it("ignores an off-site ?next= (open redirect)", async () => {
    authApi();
    const { router } = renderRoute("/admin/login?next=//evil.example");

    await logIn(ADMIN.email, PASSWORD);

    await screen.findByRole("heading", { name: "Applications", level: 1 });
    expect(router.state.location.pathname).toBe("/admin/applications");
  });

  it("skips the login form when already logged in", async () => {
    authApi({ loggedIn: true });
    renderRoute("/admin/login");
    expect(await screen.findByRole("heading", { name: "Applications", level: 1 })).toBeInTheDocument();
  });

  it("logs out and can't get back in without logging in again", async () => {
    authApi({ loggedIn: true });
    const { router } = renderRoute("/admin");

    await userEvent.click(await screen.findByRole("button", { name: "Log out" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/admin/login"));

    await router.navigate("/admin");
    // Wait for the guard's redirect first: right after navigate() the old login
    // page is briefly still on screen, and a session check may follow. Once the
    // URL is final no more redirects happen, so then wait for the login form.
    await waitFor(() => expect(router.state.location.search).toBe("?next=%2Fadmin"));
    expect(await screen.findByRole("heading", { name: "Admin login" })).toBeInTheDocument();
  });
});
