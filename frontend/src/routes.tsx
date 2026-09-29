import type { RouteObject } from "react-router";

import { Layout } from "./components/Layout";
import { RequireAdmin } from "./components/RequireAdmin";
import { DashboardPage } from "./pages/admin/DashboardPage";
import { LoginPage } from "./pages/admin/LoginPage";
import { ApplyPage } from "./pages/ApplyPage";
import { CatDetailPage } from "./pages/CatDetailPage";
import { CatListPage } from "./pages/CatListPage";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";

// Exported separately from the router so tests can mount them in a memory router.
export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "cats", element: <CatListPage /> },
      { path: "cats/:id", element: <CatDetailPage /> },
      { path: "cats/:id/apply", element: <ApplyPage /> },
      { path: "admin/login", element: <LoginPage /> },
      {
        path: "admin",
        element: <RequireAdmin />,
        children: [{ index: true, element: <DashboardPage /> }],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];
