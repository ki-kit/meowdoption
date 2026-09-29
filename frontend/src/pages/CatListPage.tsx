import { useSearchParams } from "react-router";

import { PAGE_SIZE, type CatFilters } from "../api/cats";
import { CatCard } from "../components/CatCard";
import { FilterBar } from "../components/FilterBar";
import { useCats } from "../hooks/useCats";
import { filtersFromParams, paramsFromFilters } from "../lib/catFilters";

export function CatListPage() {
  // The URL is the single source of truth for filters: shareable, survives reload.
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = filtersFromParams(searchParams);
  const { data, isPending, isError, isPlaceholderData } = useCats(filters);

  const setFilters = (next: CatFilters) => setSearchParams(paramsFromFilters(next));
  const page = filters.page ?? 1;
  const pageCount = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <section>
      <h1 className="mb-6 text-3xl font-bold text-amber-800">Our cats</h1>
      <FilterBar filters={filters} onChange={setFilters} />

      {isPending && <p>Loading cats…</p>}
      {isError && <p role="alert">Couldn't load cats. Please try again later.</p>}

      {data && (
        <>
          <p className="mb-4 text-sm text-stone-500" aria-live="polite">
            {data.total === 1 ? "1 cat found" : `${data.total} cats found`}
          </p>
          {data.items.length === 0 ? (
            <p>No cats match these filters.</p>
          ) : (
            <ul
              aria-label="Cats"
              aria-busy={isPlaceholderData}
              className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${isPlaceholderData ? "opacity-60" : ""}`}
            >
              {data.items.map((cat) => (
                <li key={cat.id}>
                  <CatCard cat={cat} />
                </li>
              ))}
            </ul>
          )}

          {pageCount > 1 && (
            <nav aria-label="Pagination" className="mt-6 flex items-center justify-center gap-4">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setFilters({ ...filters, page: page - 1 })}
                className="rounded-md border px-3 py-1 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm">
                Page {page} of {pageCount}
              </span>
              <button
                type="button"
                disabled={page >= pageCount}
                onClick={() => setFilters({ ...filters, page: page + 1 })}
                className="rounded-md border px-3 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
