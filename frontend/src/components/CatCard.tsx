import { Link } from "react-router";

import type { Cat } from "../api/cats";
import { formatAge } from "../lib/format";
import { CatBadges } from "./CatBadges";
import { CatPhoto } from "./CatPhoto";
import { MeowButton } from "./MeowButton";

export function CatCard({ cat }: { cat: Cat }) {
  return (
    <article
      aria-label={cat.name}
      className="flex h-full flex-col rounded-xl border border-amber-200 bg-white p-4 shadow-sm"
    >
      <CatPhoto name={cat.name} url={cat.primary_photo_url} className="mb-3 h-40 w-full rounded-lg" emojiClass="text-5xl" />
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">
          <Link to={`/cats/${cat.id}`} className="hover:underline">
            {cat.name}
          </Link>
        </h2>
        <MeowButton name={cat.name} src={cat.primary_sound_url} />
      </div>
      <p className="mb-2 text-sm text-stone-500">
        {formatAge(cat.age_months)}
        {cat.breed && ` · ${cat.breed}`}
      </p>
      <CatBadges cat={cat} />
      <p className="mt-3 line-clamp-2 text-sm text-stone-600">{cat.description}</p>
    </article>
  );
}
