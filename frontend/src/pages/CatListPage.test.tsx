import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { makeCat, mockApi, page, requestedUrls } from "../test/fixtures";
import { renderRoute } from "../test/renderRoute";

const luna = makeCat({ name: "Luna", sex: "female", castrated: true });
const oskar = makeCat({ name: "Oskar", sex: "male", castrated: false });
const micka = makeCat({ name: "Micka", sex: "female", castrated: false });

// Fake backend: applies sex/castrated filters like the real API.
function catsApi() {
  return mockApi((url) => {
    const sex = url.searchParams.get("sex");
    const castrated = url.searchParams.get("castrated");
    const items = [luna, oskar, micka].filter(
      (c) => (!sex || c.sex === sex) && (!castrated || String(c.castrated) === castrated),
    );
    return [200, page(items)];
  });
}

describe("CatListPage", () => {
  afterEach(() => vi.restoreAllMocks());

  it("lists cats with their badges", async () => {
    catsApi();
    renderRoute("/cats");

    const card = await screen.findByRole("article", { name: "Luna" });
    expect(within(card).getByText("Castrated")).toBeInTheDocument();
    expect(within(card).getByText("♀ Female")).toBeInTheDocument();
    expect(screen.getByText("3 cats found")).toBeInTheDocument();
    // Uncastrated cats get no castrated badge at all.
    const oskarCard = screen.getByRole("article", { name: "Oskar" });
    expect(within(oskarCard).queryByText("Castrated")).not.toBeInTheDocument();
  });

  it("filters via the URL and the API", async () => {
    const api = catsApi();
    const { router } = renderRoute("/cats");
    await screen.findByRole("article", { name: "Oskar" });

    await userEvent.selectOptions(screen.getByLabelText("Sex"), "female");
    await userEvent.selectOptions(screen.getByLabelText("Castrated"), "true");

    await waitFor(() =>
      expect(screen.queryByRole("article", { name: "Micka" })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("article", { name: "Luna" })).toBeInTheDocument();
    expect(screen.queryByRole("article", { name: "Oskar" })).not.toBeInTheDocument();

    expect(router.state.location.search).toBe("?sex=female&castrated=true");
    const last = requestedUrls(api).at(-1)!;
    expect(last.pathname).toBe("/api/v1/cats");
    expect(last.searchParams.get("sex")).toBe("female");
    expect(last.searchParams.get("castrated")).toBe("true");
  });

  it("restores filters from a shared URL", async () => {
    const api = catsApi();
    renderRoute("/cats?sex=male");

    await screen.findByRole("article", { name: "Oskar" });
    expect(screen.getByLabelText("Sex")).toHaveValue("male");
    expect(requestedUrls(api)[0].searchParams.get("sex")).toBe("male");
  });

  it("clears filters", async () => {
    catsApi();
    const { router } = renderRoute("/cats?sex=male&castrated=false");
    await screen.findByRole("article", { name: "Oskar" });

    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    await screen.findByRole("article", { name: "Luna" });
    expect(router.state.location.search).toBe("");
  });

  it("resets to page 1 when a filter changes", async () => {
    const api = mockApi(() => [200, { ...page([luna]), total: 30 }]);
    const { router } = renderRoute("/cats?page=2");
    await screen.findByText("Page 2 of 3");

    await userEvent.click(screen.getByRole("checkbox", { name: "Good with kids" }));
    await waitFor(() => expect(router.state.location.search).toBe("?good_with_kids=true"));
    expect(requestedUrls(api).at(-1)!.searchParams.get("page")).toBeNull();
  });

  it("says so when nothing matches", async () => {
    mockApi(() => [200, page([])]);
    renderRoute("/cats");
    expect(await screen.findByText("No cats match these filters.")).toBeInTheDocument();
  });

  it("shows an error when the API fails", async () => {
    mockApi(() => [500, { detail: "boom" }]);
    renderRoute("/cats");
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load cats");
  });
});
