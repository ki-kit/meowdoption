import type { ReactNode } from "react";

const TONES = {
  amber: "bg-amber-100 text-amber-800",
  green: "bg-green-100 text-green-800",
  sky: "bg-sky-100 text-sky-800",
  stone: "bg-stone-200 text-stone-700",
} as const;

export function Badge({ tone = "stone", children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}>
      {children}
    </span>
  );
}
