import { useState } from "react";
import { Link, useParams } from "react-router";

import { ApiError } from "../api/client";
import type { Photo } from "../api/cats";
import { CatBadges } from "../components/CatBadges";
import { CatPhoto } from "../components/CatPhoto";
import { MeowButton } from "../components/MeowButton";
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
        <Gallery name={cat.name} photos={cat.photos} />
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-amber-800">{cat.name}</h1>
            <MeowButton name={cat.name} src={cat.primary_sound_url} size="lg" />
          </div>
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
          {cat.status === "adopted" ? (
            <p className="mt-6 font-medium text-stone-600">{cat.name} has already found a home 🏡</p>
          ) : (
            <Link
              to={`/cats/${cat.id}/apply`}
              className="mt-6 inline-block rounded-full bg-amber-600 px-6 py-2 font-semibold text-white hover:bg-amber-700"
            >
              Apply to adopt {cat.name}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

function Gallery({ name, photos }: { name: string; photos: Photo[] }) {
  const primary = photos.find((p) => p.is_primary) ?? photos[0];
  const [selectedId, setSelectedId] = useState(primary?.id);
  const selected = photos.find((p) => p.id === selectedId) ?? primary;

  return (
    <div>
      <CatPhoto name={name} url={selected?.url ?? null} className="h-72 w-full rounded-lg" emojiClass="text-8xl" />
      {photos.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedId(p.id)}
              aria-label={`Show photo ${i + 1} of ${name}`}
              aria-pressed={p.id === selected?.id}
              className="overflow-hidden rounded-md ring-amber-600 aria-pressed:ring-2"
            >
              <img src={p.url} alt="" className="h-16 w-16 object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
