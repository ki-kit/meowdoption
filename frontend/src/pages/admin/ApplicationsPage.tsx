import { Link, useSearchParams } from "react-router";

import {
  APPLICATIONS_PAGE_SIZE,
  type AdminApplication,
  type ApplicationFilters,
  type ApplicationStatus,
} from "../../api/admin";
import { HOUSING_LABEL } from "../../api/applications";
import { errorMessage } from "../../api/client";
import { Badge } from "../../components/Badge";
import { ConfirmButton } from "../../components/ConfirmButton";
import { useApplications, useSetApplicationStatus } from "../../hooks/useAdmin";

const TABS: [ApplicationStatus | "all", string][] = [
  ["new", "New"],
  ["approved", "Approved"],
  ["rejected", "Rejected"],
  ["all", "All"],
];
const STATUS_TONE = { new: "amber", approved: "green", rejected: "stone" } as const;
const STATUS_LABEL = { new: "New", approved: "Approved", rejected: "Rejected" } as const;

function filtersFromParams(params: URLSearchParams): ApplicationFilters & { tab: string } {
  // Default tab is "new": the inbox of things waiting for a decision.
  const tab = params.get("status") ?? "new";
  const catId = Number(params.get("cat_id"));
  const page = Number(params.get("page"));
  return {
    tab,
    status: tab === "all" ? undefined : (tab as ApplicationStatus),
    cat_id: Number.isInteger(catId) && catId > 0 ? catId : undefined,
    page: Number.isInteger(page) && page > 1 ? page : undefined,
  };
}

export function ApplicationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { tab, ...filters } = filtersFromParams(searchParams);
  const { data, isPending, isError } = useApplications(filters);
  const setStatus = useSetApplicationStatus();

  const go = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(changes)) {
      if (v === undefined) next.delete(k);
      else next.set(k, v);
    }
    setSearchParams(next);
  };

  const catName = filters.cat_id !== undefined ? data?.items[0]?.cat.name : undefined;
  const page = filters.page ?? 1;
  const pageCount = data ? Math.max(1, Math.ceil(data.total / APPLICATIONS_PAGE_SIZE)) : 1;

  return (
    <section>
      <h1 className="mb-4 text-3xl font-bold text-amber-800">Applications</h1>

      <div className="mb-4 flex flex-wrap items-center gap-2" role="tablist" aria-label="Status">
        {TABS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => go({ status: value === "new" ? undefined : value, page: undefined })}
            className={`rounded-full px-3 py-1 text-sm ${tab === value ? "bg-stone-800 text-white" : "bg-white hover:bg-stone-100"}`}
          >
            {label}
          </button>
        ))}
        {filters.cat_id !== undefined && (
          <span className="ml-2 text-sm text-stone-600">
            Only for {catName ?? `cat #${filters.cat_id}`} ·{" "}
            <button type="button" className="text-amber-700 underline" onClick={() => go({ cat_id: undefined })}>
              Show all cats
            </button>
          </span>
        )}
      </div>

      {setStatus.isError && (
        <p role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {errorMessage(setStatus.error) ?? "Couldn't update the application. Please try again."}
        </p>
      )}

      {isPending && <p>Loading applications…</p>}
      {isError && <p role="alert">Couldn't load applications.</p>}
      {data && data.items.length === 0 && <p className="text-stone-600">No applications here.</p>}

      <ul className="space-y-3">
        {data?.items.map((a) => (
          <li key={a.id}>
            <ApplicationCard
              application={a}
              busy={setStatus.isPending}
              onSetStatus={(status) => setStatus.mutate({ id: a.id, status })}
            />
          </li>
        ))}
      </ul>

      {pageCount > 1 && (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-center gap-4 text-sm">
          <button type="button" disabled={page <= 1} onClick={() => go({ page: String(page - 1) })} className="rounded-md border px-3 py-1 disabled:opacity-40">
            Previous
          </button>
          <span>
            Page {page} of {pageCount}
          </span>
          <button type="button" disabled={page >= pageCount} onClick={() => go({ page: String(page + 1) })} className="rounded-md border px-3 py-1 disabled:opacity-40">
            Next
          </button>
        </nav>
      )}
    </section>
  );
}

type CardProps = {
  application: AdminApplication;
  busy: boolean;
  onSetStatus: (status: ApplicationStatus) => void;
};

function ApplicationCard({ application: a, busy, onSetStatus }: CardProps) {
  return (
    <article
      aria-label={`Application from ${a.full_name} for ${a.cat.name}`}
      className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold">
            {a.full_name} → <Link to={`/cats/${a.cat.id}`} className="text-amber-700 hover:underline">{a.cat.name}</Link>
          </h2>
          <p className="text-sm text-stone-500">
            <a href={`mailto:${a.email}`} className="hover:underline">{a.email}</a>
            {a.phone && ` · ${a.phone}`} · {new Date(a.created_at).toLocaleDateString()}
          </p>
        </div>
        <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
      </div>

      <p className="mt-2 text-sm">
        {HOUSING_LABEL[a.housing_type]} · {a.has_other_pets ? "Has other pets" : "No other pets"}
      </p>
      {a.message && <p className="mt-2 whitespace-pre-line text-sm text-stone-700">{a.message}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {a.status !== "approved" && (
          <ConfirmButton
            label="Approve"
            confirmLabel="Confirm approval"
            tone="primary"
            disabled={busy || a.cat.status === "adopted"}
            warning={`${a.cat.name} will be marked adopted and other open applications for ${a.cat.name} will be rejected.`}
            onConfirm={() => onSetStatus("approved")}
          />
        )}
        {a.status === "new" && (
          <button type="button" disabled={busy} onClick={() => onSetStatus("rejected")} className="rounded-full border border-stone-300 px-3 py-1 text-sm hover:bg-stone-100 disabled:opacity-50">
            Reject
          </button>
        )}
        {a.status === "rejected" && (
          <button type="button" disabled={busy} onClick={() => onSetStatus("new")} className="rounded-full border border-stone-300 px-3 py-1 text-sm hover:bg-stone-100 disabled:opacity-50">
            Reopen
          </button>
        )}
        {a.status === "approved" && (
          <ConfirmButton
            label="Undo approval"
            confirmLabel="Confirm undo"
            tone="danger"
            disabled={busy}
            warning={`This rejects the application and makes ${a.cat.name} available again.`}
            onConfirm={() => onSetStatus("rejected")}
          />
        )}
      </div>
    </article>
  );
}
