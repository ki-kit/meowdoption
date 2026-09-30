import { Link, useParams } from "react-router";

import { ApiError } from "../api/client";
import { CatBadges } from "../components/CatBadges";
import { useCat } from "../hooks/useCats";
import { formatAge } from "../lib/format";

const TRAITS = [
  ["good_with_kids", "kids"],
  ["good_with_cats", "other cats"],
  ["good_with_dogs", "dogs"],
] as const;

export function CatDetailPage() {
  const { id } = useParams();
  const { data: cat, isPending, error } = useCat(Number(id));

  const backLink = (
    <Link to="/cats" className="text-amber-700 underline">
      ← Back to all cats
    </Link>
  );

  if (error instanceof ApiError && error.status === 404) {
    return (
      <section className="text-center">
        <h1 className="mb-4 text-3xl font-bold text-amber-800">Cat not found</h1>
        {backLink}
      </section>
    );
  }
  if (error) return <p role="alert">Couldn't load this cat. Please try again later.</p>;
  if (isPending) return <p>Loading…</p>;

  const goodWith = TRAITS.filter(([key]) => cat[key]).map(([, label]) => label);

  return (
    <article className="rounded-xl bg-white p-6 shadow-sm">
      {backLink}
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <div className="flex h-64 items-center justify-center rounded-lg bg-amber-100 text-8xl">
          🐈
        </div>
        <div>
          <h1 className="text-3xl font-bold text-amber-800">{cat.name}</h1>
          <p className="mb-3 text-stone-500">
            {formatAge(cat.age_months)}
            {cat.breed && ` · ${cat.breed}`}
          </p>
          <CatBadges cat={cat} />
          <p className="mt-4 whitespace-pre-line">{cat.description}</p>
          <p className="mt-4 text-sm">
            <span className="font-medium">Good with: </span>
            {goodWith.length ? goodWith.join(", ") : "not known yet"}
          </p>
        </div>
      </div>
    </article>
  );
}
