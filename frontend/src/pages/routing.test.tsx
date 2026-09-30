import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderRoute } from "../test/renderRoute";

describe("routing", () => {
  it("shows the home page at /", () => {
    renderRoute("/");
    expect(
      screen.getByRole("heading", { name: /find your new best friend/i }),
    ).toBeInTheDocument();
  });

  it("shows a not-found page for unknown URLs and links back home", async () => {
    renderRoute("/no-such-page");
    expect(screen.getByRole("heading", { name: /page not found/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("link", { name: /back to home/i }));
    expect(
      screen.getByRole("heading", { name: /find your new best friend/i }),
    ).toBeInTheDocument();
  });
});
