import type { Cat } from "../api/cats";
import { SEX_LABEL, STATUS_LABEL } from "../lib/format";
import { Badge } from "./Badge";

const STATUS_TONE = { available: "green", pending: "amber", adopted: "stone" } as const;

export function CatBadges({ cat }: { cat: Cat }) {
  return (
    <div className="flex flex-wrap gap-1">
      <Badge tone={STATUS_TONE[cat.status]}>{STATUS_LABEL[cat.status]}</Badge>
      <Badge>{SEX_LABEL[cat.sex]}</Badge>
      {cat.castrated && <Badge tone="sky">Castrated</Badge>}
    </div>
  );
}
