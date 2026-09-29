import type { ComponentType } from "react";
import { Navigate, type RouteObject } from "react-router";

import { Layout } from "./components/Layout";
import { RequireAdmin } from "./components/RequireAdmin";
import { CatDetailPage } from "./pages/CatDetailPage";
import { CatListPage } from "./pages/CatListPage";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";

/**
 * Load a page's code only when its route is visited. Forms (zod +
 * react-hook-form) and the whole admin area stay out of the bundle that
 * every visitor downloads just to browse cats.
 */
function lazyPage<M>(load: () => Promise<M>, name: keyof M) {
  return async () => ({ Component: (await load())[name] as ComponentType });
}

// Exported separately from the router so tests can mount them in a memory router.
export const routes: RouteObject[] = [
  {
    element: <Layout />,
    // Shown while the first page's code loads when the app starts on a lazy route.
    HydrateFallback: () => <p className="p-8 text-center">Loading…</p>,
    children: [
      { index: true, element: <HomePage /> },
      { path: "cats", element: <CatListPage /> },
      { path: "cats/:id", element: <CatDetailPage /> },
      { path: "cats/:id/apply", lazy: lazyPage(() => import("./pages/ApplyPage"), "ApplyPage") },
      { path: "admin/login", lazy: lazyPage(() => import("./pages/admin/LoginPage"), "LoginPage") },
      {
        path: "admin",
        element: <RequireAdmin />,
        children: [
          {
            lazy: lazyPage(() => import("./pages/admin/AdminLayout"), "AdminLayout"),
            children: [
              { index: true, element: <Navigate to="/admin/applications" replace /> },
              {
                path: "applications",
                lazy: lazyPage(() => import("./pages/admin/ApplicationsPage"), "ApplicationsPage"),
              },
              { path: "cats", lazy: lazyPage(() => import("./pages/admin/CatsPage"), "CatsPage") },
              { path: "cats/new", lazy: lazyPage(() => import("./pages/admin/CatFormPage"), "CatFormPage") },
              {
                path: "cats/:id/edit",
                lazy: lazyPage(() => import("./pages/admin/CatFormPage"), "CatFormPage"),
              },
            ],
          },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];
