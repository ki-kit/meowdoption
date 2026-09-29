// Every call goes through here, so the API version lives in one place.
export const API_BASE = "/api/v1";

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: unknown,
  ) {
    super(`API request failed with status ${status}`);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new ApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

export function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(path, init);
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** FastAPI's `{"detail": "..."}` message, if the error carries one. */
export function errorMessage(error: unknown): string | undefined {
  if (!(error instanceof ApiError)) return undefined;
  const detail = (error.detail as { detail?: unknown } | null)?.detail;
  return typeof detail === "string" ? detail : undefined;
}

/**
 * FastAPI 422 body -> { field: message }.
 * Shape: {"detail": [{"loc": ["body", "email"], "msg": "..."}, ...]}
 */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || error.status !== 422) return {};
  const detail = (error.detail as { detail?: unknown } | null)?.detail;
  if (!Array.isArray(detail)) return {};
  const result: Record<string, string> = {};
  for (const item of detail as { loc?: unknown[]; msg?: string }[]) {
    const field = item.loc?.at(-1);
    if (typeof field === "string" && item.msg) result[field] ??= item.msg;
  }
  return result;
}
