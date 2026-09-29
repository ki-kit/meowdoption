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

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
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
