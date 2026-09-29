import { Navigate, Outlet, useLocation } from "react-router";

import { useMe } from "../hooks/useAuth";

/**
 * Route guard for /admin/*. UX only: the API enforces auth on every admin
 * request, so hiding pages here is convenience, not security.
 */
export function RequireAdmin() {
  const { data: me, isPending, isError } = useMe();
  const location = useLocation();

  if (isPending) return <p>Checking your session…</p>;
  if (isError) return <p role="alert">Couldn't reach the server. Please try again later.</p>;
  if (!me) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/admin/login?next=${next}`} replace />;
  }
  return <Outlet />;
}
