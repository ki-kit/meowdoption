import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { Cat } from "../api/cats";
import { makeCat, mockApi, requestedUrls } from "../test/fixtures";
import { renderRoute } from "../test/renderRoute";

const RECEIPT = { id: 1, cat_id: 0, status: "new", created_at: "2026-01-01T00:00:00" };

/** Fake API: GET cat -> cat; POST application -> the given reply. */
function applyApi(cat: Cat, postReply: [number, unknown] = [201, RECEIPT]) {
  return mockApi((url) => (url.pathname.endsWith("/applications") ? postReply : [200, cat]));
}

async function fillValidForm() {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText("Full name"), "Jana Nováková");
  await user.type(screen.getByLabelText("Email"), "jana@example.com");
  await user.selectOptions(screen.getByLabelText("Housing"), "Apartment");
  await user.click(screen.getByLabelText("I have other pets"));
  await user.type(screen.getByLabelText("Tell us about your home"), "Quiet flat.");
  return user;
}

describe("ApplyPage", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows validation errors without calling the API", async () => {
    const cat = makeCat({ name: "Luna" });
    const api = applyApi(cat);
    renderRoute(`/cats/${cat.id}/apply`);

    await userEvent.click(await screen.findByRole("button", { name: "Send application" }));

    expect(await screen.findByText("Please enter your name")).toBeInTheDocument();
    expect(screen.getByText("Please enter your email")).toBeInTheDocument();
    expect(screen.getByText("Please choose your housing")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    // Only the GET for the cat, no POST.
    expect(api.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(0);
  });

  it("submits the form and thanks the visitor", async () => {
    const cat = makeCat({ name: "Luna" });
    const api = applyApi(cat);
    renderRoute(`/cats/${cat.id}/apply`);

    const user = await fillValidForm();
    await user.click(screen.getByRole("button", { name: "Send application" }));

    expect(await screen.findByRole("heading", { name: "Thank you!" })).toBeInTheDocument();
    expect(screen.getByText(/application for Luna/)).toBeInTheDocument();

    const post = api.mock.calls.find(([, init]) => init?.method === "POST")!;
    expect(requestedUrls(api).at(-1)!.pathname).toBe(`/api/v1/cats/${cat.id}/applications`);
    expect(JSON.parse(String(post[1]!.body))).toEqual({
      full_name: "Jana Nováková",
      email: "jana@example.com",
      phone: "",
      message: "Quiet flat.",
      housing_type: "apartment",
      has_other_pets: true,
    });
  });

  it("shows the server's message on a conflict", async () => {
    const cat = makeCat();
    applyApi(cat, [409, { detail: "You have already applied for this cat." }]);
    renderRoute(`/cats/${cat.id}/apply`);

    const user = await fillValidForm();
    await user.click(screen.getByRole("button", { name: "Send application" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You have already applied for this cat.",
    );
  });

  it("puts server-side validation errors on the matching field", async () => {
    const cat = makeCat();
    applyApi(cat, [422, { detail: [{ loc: ["body", "email"], msg: "Domain does not exist" }] }]);
    renderRoute(`/cats/${cat.id}/apply`);

    const user = await fillValidForm();
    await user.click(screen.getByRole("button", { name: "Send application" }));

    expect(await screen.findByText("Domain does not exist")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not offer a form for an adopted cat", async () => {
    const cat = makeCat({ name: "Garfield", status: "adopted" });
    applyApi(cat);
    renderRoute(`/cats/${cat.id}/apply`);

    expect(
      await screen.findByRole("heading", { name: "Garfield has already found a home" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send application" })).not.toBeInTheDocument();
  });
});

describe("CatDetailPage apply button", () => {
  afterEach(() => vi.restoreAllMocks());

  it("links to the form for an available cat", async () => {
    const cat = makeCat({ name: "Luna" });
    applyApi(cat);
    renderRoute(`/cats/${cat.id}`);

    await userEvent.click(await screen.findByRole("link", { name: "Apply to adopt Luna" }));
    expect(await screen.findByRole("heading", { name: "Apply to adopt Luna" })).toBeInTheDocument();
  });

  it("is replaced by a note for an adopted cat", async () => {
    const cat = makeCat({ name: "Garfield", status: "adopted" });
    applyApi(cat);
    renderRoute(`/cats/${cat.id}`);

    expect(await screen.findByText(/Garfield has already found a home/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Apply to adopt/ })).not.toBeInTheDocument();
  });
});
