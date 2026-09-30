import { useState, type ReactNode } from "react";

type Props = {
  label: string;
  confirmLabel: string;
  /** Shown next to the confirm button: say what will happen. */
  warning?: ReactNode;
  onConfirm: () => void;
  disabled?: boolean;
  tone?: "primary" | "danger" | "plain";
};

const TONES = {
  primary: "bg-amber-600 text-white hover:bg-amber-700",
  danger: "bg-red-600 text-white hover:bg-red-700",
  plain: "border border-stone-300 hover:bg-stone-100",
};
const base = "rounded-full px-3 py-1 text-sm font-medium disabled:opacity-50";

/** Two-step button for actions with side effects: click, then confirm in place. */
export function ConfirmButton({ label, confirmLabel, warning, onConfirm, disabled, tone = "plain" }: Props) {
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return (
      <button type="button" disabled={disabled} className={`${base} ${TONES[tone]}`} onClick={() => setAsking(true)}>
        {label}
      </button>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 p-2">
      {warning && <span className="text-sm text-stone-700">{warning}</span>}
      <button
        type="button"
        disabled={disabled}
        className={`${base} ${tone === "plain" ? TONES.primary : TONES[tone]}`}
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
      >
        {confirmLabel}
      </button>
      <button type="button" className={`${base} ${TONES.plain}`} onClick={() => setAsking(false)}>
        Cancel
      </button>
    </span>
  );
}
