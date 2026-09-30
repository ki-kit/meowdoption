import { NavLink, Outlet, useNavigate } from "react-router";

import { useLogout, useMe } from "../../hooks/useAuth";

const tab = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-4 py-1 ${isActive ? "bg-amber-600 text-white" : "hover:bg-amber-100"}`;

export function AdminLayout() {
  const { data: me } = useMe();
  const logoutMutation = useLogout();
  const navigate = useNavigate();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-3 shadow-sm">
        <nav aria-label="Admin" className="flex gap-2 text-sm font-medium">
          <NavLink to="/admin/applications" className={tab}>
            Applications
          </NavLink>
          <NavLink to="/admin/cats" className={tab}>
            Cats
          </NavLink>
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-stone-500">Signed in as {me?.email}</span>
          <button
            type="button"
            disabled={logoutMutation.isPending}
            onClick={() =>
              logoutMutation.mutate(undefined, {
                onSuccess: () => navigate("/admin/login", { replace: true }),
              })
            }
            className="rounded-full border border-stone-300 px-4 py-1 hover:bg-stone-100"
          >
            Log out
          </button>
        </div>
      </div>
      <Outlet />
    </div>
  );
}
