import type { RouteObject } from "react-router";

import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";

// Exported separately from the router so tests can mount them in a memory router.
export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];
