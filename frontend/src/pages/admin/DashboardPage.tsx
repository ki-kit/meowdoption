import { useNavigate } from "react-router";

import { useLogout, useMe } from "../../hooks/useAuth";

// Placeholder: cat management and application review arrive in step 7.
export function DashboardPage() {
  const { data: me } = useMe();
  const logoutMutation = useLogout();
  const navigate = useNavigate();

  return (
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-amber-800">Admin dashboard</h1>
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
      <p className="mt-6 text-stone-600">Cat management and application review are coming next.</p>
    </section>
  );
}
