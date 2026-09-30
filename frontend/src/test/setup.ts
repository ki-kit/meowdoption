// Adds DOM matchers like toBeInTheDocument() to Vitest's expect.
import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";
import type { RouteObject } from "react-router";

import { routes } from "../routes";

// Generous waits for findBy*/waitFor: this containerised test env is slow.
// Only affects how long they wait before failing, not passing tests.
configure({ asyncUtilTimeout: 5000 });

/** Call every route's own lazy() loader (no second list to keep in sync). */
function preload(routeList: RouteObject[]): Promise<unknown> {
  return Promise.all(
    routeList.flatMap((route) => [
      typeof route.lazy === "function" ? route.lazy() : undefined,
      route.children ? preload(route.children) : undefined,
    ]),
  );
}

// Lazy routes import their code on first visit. Cold, that import (zod, the
// forms) can take longer than any single test should wait when the machine
// is busy, which made the first test to open a lazy page flaky. Warming them
// up here keeps that one-off cost out of the tests; rendering still goes
// through the same lazy() calls, now answered from the module cache.
beforeAll(() => preload(routes), 60_000);
