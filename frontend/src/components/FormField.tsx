import { cloneElement, useId, type ReactElement } from "react";

type Props = {
  label: string;
  error?: string;
  hint?: string;
  children: ReactElement<Record<string, unknown>>;
};

export const inputClass =
  "mt-1 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 aria-[invalid=true]:border-red-500";

/** Label + control + error, with the a11y attributes wired up for the child input. */
export function FormField({ label, error, hint, children }: Props) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ");

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {cloneElement(children, {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy || undefined,
      })}
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-stone-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
