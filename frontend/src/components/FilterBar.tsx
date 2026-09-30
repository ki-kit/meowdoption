import type { CatFilters } from "../api/cats";

type Props = {
  filters: CatFilters;
  /** Only the fields that changed: the parent merges them into the latest
   * state, so two quick changes can't overwrite each other. */
  onChange: (patch: CatFilters) => void;
  onClear: () => void;
};

// "" in a <select> means "any", i.e. the filter is not sent.
function boolValue(v: boolean | undefined) {
  return v === undefined ? "" : String(v);
}
function parseBool(v: string) {
  return v === "" ? undefined : v === "true";
}

const TRAITS = [
  ["good_with_kids", "Good with kids"],
  ["good_with_cats", "Good with cats"],
  ["good_with_dogs", "Good with dogs"],
] as const;

const selectClass = "mt-1 block rounded-md border border-stone-300 bg-white px-2 py-1";

export function FilterBar({ filters, onChange, onClear }: Props) {
  // Any filter change goes back to page 1: the old page may not exist anymore.
  const update = (patch: CatFilters) => onChange({ ...patch, page: undefined });

  return (
    <form
      role="search"
      aria-label="Filter cats"
      className="mb-6 flex flex-wrap items-end gap-4 rounded-xl bg-white p-4 shadow-sm"
      onSubmit={(e) => e.preventDefault()}
    >
      <label className="text-sm">
        Sex
        <select
          className={selectClass}
          value={filters.sex ?? ""}
          onChange={(e) => update({ sex: (e.target.value || undefined) as CatFilters["sex"] })}
        >
          <option value="">Any</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
        </select>
      </label>

      <label className="text-sm">
        Castrated
        <select
          className={selectClass}
          value={boolValue(filters.castrated)}
          onChange={(e) => update({ castrated: parseBool(e.target.value) })}
        >
          <option value="">Any</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </label>

      <label className="text-sm">
        Status
        <select
          className={selectClass}
          value={filters.status ?? ""}
          onChange={(e) => update({ status: (e.target.value || undefined) as CatFilters["status"] })}
        >
          <option value="">Any</option>
          <option value="available">Available</option>
          <option value="pending">Adoption pending</option>
          <option value="adopted">Adopted</option>
        </select>
      </label>

      <fieldset className="flex gap-3 text-sm">
        <legend className="sr-only">Personality</legend>
        {TRAITS.map(([key, label]) => (
          <label key={key} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={filters[key] === true}
              // Unchecked means "don't care", not "must be false".
              onChange={(e) => update({ [key]: e.target.checked || undefined })}
            />
            {label}
          </label>
        ))}
      </fieldset>

      <button
        type="button"
        className="text-sm text-amber-700 underline"
        onClick={onClear}
      >
        Clear filters
      </button>
    </form>
  );
}
