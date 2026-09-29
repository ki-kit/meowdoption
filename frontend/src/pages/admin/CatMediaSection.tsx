import { useState, type ChangeEvent } from "react";

import { MEDIA_RULES, type MediaKind } from "../../api/admin";
import type { Cat, Photo, Sound } from "../../api/cats";
import { errorMessage } from "../../api/client";
import { Badge } from "../../components/Badge";
import { ConfirmButton } from "../../components/ConfirmButton";
import { useMediaActions } from "../../hooks/useAdmin";

const TITLES = { photos: "Photos", sounds: "Meows" } as const;
const SINGULAR = { photos: "photo", sounds: "sound" } as const;

export function CatMediaSection({ cat, kind }: { cat: Cat; kind: MediaKind }) {
  const { upload, makePrimary, remove } = useMediaActions(kind, cat.id);
  const [clientError, setClientError] = useState<string>();
  const rules = MEDIA_RULES[kind];
  const items: (Photo | Sound)[] = kind === "photos" ? cat.photos : cat.sounds;

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again after an error
    if (!file) return;
    upload.reset();
    if (file.size > rules.maxBytes) {
      setClientError(`That file is too big (${rules.label}).`);
      return;
    }
    setClientError(undefined);
    upload.mutate(file);
  };

  const failed = [upload, makePrimary, remove].find((m) => m.isError);
  const error = clientError ?? (failed && (errorMessage(failed.error) ?? "Something went wrong. Please try again."));

  return (
    <section aria-labelledby={`${kind}-heading`} className="mx-auto mt-6 max-w-xl rounded-xl bg-white p-6 shadow-sm">
      <h2 id={`${kind}-heading`} className="mb-4 text-xl font-bold text-amber-800">
        {TITLES[kind]}
      </h2>

      {items.length === 0 && (
        <p className="mb-4 text-sm text-stone-500">
          {kind === "photos" ? "No photos yet." : "No meows yet: visitors hear the default meow."}
        </p>
      )}

      <ul className={kind === "photos" ? "mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3" : "mb-4 space-y-3"}>
        {items.map((item, i) => (
          <li key={item.id} aria-label={`${SINGULAR[kind]} ${i + 1}`} className="rounded-lg border border-stone-200 p-2">
            {kind === "photos" ? (
              <img src={item.url} alt={`Photo ${i + 1} of ${cat.name}`} className="mb-2 h-28 w-full rounded object-cover" />
            ) : (
              <div className="mb-2 flex items-center gap-2">
                <audio controls preload="none" src={item.url} className="h-8 max-w-full" />
                {(item as Sound).duration_s != null && (
                  <span className="text-xs text-stone-500">{(item as Sound).duration_s}s</span>
                )}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {item.is_primary ? (
                <Badge tone="green">Primary</Badge>
              ) : (
                <button
                  type="button"
                  disabled={makePrimary.isPending}
                  onClick={() => makePrimary.mutate(item.id)}
                  className="rounded-full border border-stone-300 px-2 py-0.5 text-xs hover:bg-stone-100"
                >
                  Make primary
                </button>
              )}
              <ConfirmButton
                label="Delete"
                confirmLabel="Delete it"
                tone="danger"
                disabled={remove.isPending}
                onConfirm={() => remove.mutate(item.id)}
              />
            </div>
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <label className="inline-block cursor-pointer rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700">
        {upload.isPending ? "Uploading…" : `Add ${SINGULAR[kind]}`}
        <input type="file" accept={rules.accept} onChange={onFile} disabled={upload.isPending} className="sr-only" />
      </label>
      <span className="ml-3 text-xs text-stone-500">{rules.label}</span>
    </section>
  );
}
