import { Link, useSearchParams } from "react-router";

import { PAGE_SIZE } from "../../api/cats";
import { errorMessage } from "../../api/client";
import { CatBadges } from "../../components/CatBadges";
import { ConfirmButton } from "../../components/ConfirmButton";
import { useDeleteCat } from "../../hooks/useAdmin";
import { useCats } from "../../hooks/useCats";
import { formatAge } from "../../lib/format";

export function CatsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const pageParam = Number(searchParams.get("page"));
  const page = Number.isInteger(pageParam) && pageParam > 1 ? pageParam : 1;
  // Same endpoint as the public catalog: it already lists every status.
  const { data, isPending, isError } = useCats({ page: page > 1 ? page : undefined });
  const deleteCat = useDeleteCat();
  const pageCount = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-amber-800">Cats</h1>
        <Link to="/admin/cats/new" className="rounded-full bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700">
          Add cat
        </Link>
      </div>

      {deleteCat.isError && (
        <p role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {errorMessage(deleteCat.error) ?? "Couldn't delete the cat. Please try again."}
        </p>
      )}
      {isPending && <p>Loading cats…</p>}
      {isError && <p role="alert">Couldn't load cats.</p>}

      {data && (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-amber-50 text-stone-600">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Age</th>
                <th className="p-3">Details</th>
                <th className="p-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((cat) => (
                <tr key={cat.id} aria-label={cat.name} className="border-b border-stone-200 last:border-0">
                  <td className="p-3 font-medium">
                    <Link to={`/cats/${cat.id}`} className="hover:underline">{cat.name}</Link>
                  </td>
                  <td className="p-3">{formatAge(cat.age_months)}</td>
                  <td className="p-3"><CatBadges cat={cat} /></td>
                  <td className="p-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link to={`/admin/applications?status=all&cat_id=${cat.id}`} className="rounded-full border border-stone-300 px-3 py-1 hover:bg-stone-100">
                        Applications
                      </Link>
                      <Link to={`/admin/cats/${cat.id}/edit`} className="rounded-full border border-stone-300 px-3 py-1 hover:bg-stone-100">
                        Edit
                      </Link>
                      <ConfirmButton
                        label="Delete"
                        confirmLabel={`Delete ${cat.name}`}
                        tone="danger"
                        disabled={deleteCat.isPending}
                        warning="This also deletes all of its applications."
                        onConfirm={() => deleteCat.mutate(cat.id)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageCount > 1 && (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-center gap-4 text-sm">
          <button type="button" disabled={page <= 1} onClick={() => setSearchParams({ page: String(page - 1) })} className="rounded-md border px-3 py-1 disabled:opacity-40">
            Previous
          </button>
          <span>Page {page} of {pageCount}</span>
          <button type="button" disabled={page >= pageCount} onClick={() => setSearchParams({ page: String(page + 1) })} className="rounded-md border px-3 py-1 disabled:opacity-40">
            Next
          </button>
        </nav>
      )}
    </section>
  );
}
