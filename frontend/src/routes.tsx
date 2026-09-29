import { Navigate, type RouteObject } from "react-router";

import { Layout } from "./components/Layout";
import { RequireAdmin } from "./components/RequireAdmin";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { ApplicationsPage } from "./pages/admin/ApplicationsPage";
import { CatFormPage } from "./pages/admin/CatFormPage";
import { CatsPage } from "./pages/admin/CatsPage";
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
        children: [
          {
            element: <AdminLayout />,
            children: [
              { index: true, element: <Navigate to="/admin/applications" replace /> },
              { path: "applications", element: <ApplicationsPage /> },
              { path: "cats", element: <CatsPage /> },
              { path: "cats/new", element: <CatFormPage /> },
              { path: "cats/:id/edit", element: <CatFormPage /> },
            ],
          },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];
