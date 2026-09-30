import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";

import { createQueryClient } from "../lib/queryClient";
import { routes } from "../routes";

/** Render the real app routes at `path`, without a browser URL bar. */
export function renderRoute(path: string) {
  const queryClient = createQueryClient({ retry: false });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  // router is returned so tests can assert on the URL (e.g. filter params).
  return { ...view, router };
}
