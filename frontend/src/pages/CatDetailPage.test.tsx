import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { makeCat, mockApi, page } from "../test/fixtures";
import { renderRoute } from "../test/renderRoute";

describe("CatDetailPage", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows the cat's details", async () => {
    const cat = makeCat({
      name: "Luna",
      age_months: 18,
      breed: "British Shorthair",
      castrated: true,
      good_with_kids: true,
      good_with_dogs: true,
    });
    mockApi((url) => (url.pathname === `/api/v1/cats/${cat.id}` ? [200, cat] : [404, {}]));
    renderRoute(`/cats/${cat.id}`);

    expect(await screen.findByRole("heading", { name: "Luna" })).toBeInTheDocument();
    expect(screen.getByText("1 year · British Shorthair")).toBeInTheDocument();
    expect(screen.getByText("Castrated")).toBeInTheDocument();
    expect(screen.getByText("kids, dogs")).toBeInTheDocument();
  });

  it("shows 'Cat not found' for an unknown id and links back to the list", async () => {
    mockApi((url) => (url.pathname === "/api/v1/cats" ? [200, page([])] : [404, { detail: "Cat not found" }]));
    renderRoute("/cats/999");

    expect(await screen.findByRole("heading", { name: "Cat not found" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("link", { name: /back to all cats/i }));
    expect(await screen.findByRole("heading", { name: "Our cats" })).toBeInTheDocument();
  });

  it("opens from a card in the list", async () => {
    const cat = makeCat({ name: "Mourek" });
    mockApi((url) => [200, url.pathname === "/api/v1/cats" ? page([cat]) : cat]);
    renderRoute("/cats");

    await userEvent.click(await screen.findByRole("link", { name: "Mourek" }));
    expect(await screen.findByRole("heading", { name: "Mourek", level: 1 })).toBeInTheDocument();
  });
});
