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
  // 204 No Content (e.g. logout) has no body to parse.
  if (res.status === 204) return undefined as T;
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

export function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function apiDelete(path: string): Promise<void> {
  return request<void>(path, { method: "DELETE" });
}

/** multipart/form-data upload. No Content-Type header: the browser sets it
 * with the multipart boundary. */
export function apiUpload<T>(path: string, file: File): Promise<T> {
  const body = new FormData();
  body.append("file", file);
  return request<T>(path, { method: "POST", body });
}

/** Form-encoded POST, as OAuth2's password login requires. */
export function apiPostForm<T>(path: string, fields: Record<string, string>): Promise<T> {
  return request<T>(path, { method: "POST", body: new URLSearchParams(fields) });
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
