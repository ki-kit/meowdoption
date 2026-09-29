import { Link } from "react-router";

import type { Cat } from "../api/cats";
import { formatAge } from "../lib/format";
import { CatBadges } from "./CatBadges";

export function CatCard({ cat }: { cat: Cat }) {
  return (
    <article
      aria-label={cat.name}
      className="flex h-full flex-col rounded-xl border border-amber-200 bg-white p-4 shadow-sm"
    >
      {/* Placeholder until photo upload lands (step 8). */}
      <div className="mb-3 flex h-32 items-center justify-center rounded-lg bg-amber-100 text-5xl">
        🐈
      </div>
      <h2 className="text-lg font-semibold">
        <Link to={`/cats/${cat.id}`} className="hover:underline">
          {cat.name}
        </Link>
      </h2>
      <p className="mb-2 text-sm text-stone-500">
        {formatAge(cat.age_months)}
        {cat.breed && ` · ${cat.breed}`}
      </p>
      <CatBadges cat={cat} />
      <p className="mt-3 line-clamp-2 text-sm text-stone-600">{cat.description}</p>
    </article>
  );
}
