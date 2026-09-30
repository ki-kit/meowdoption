import { ApiError, apiGet, apiPostForm } from "./client";

export interface Admin {
  id: number;
  email: string;
}

// The API also returns the token in the body (for API/mobile clients); the SPA
// ignores it and relies on the httpOnly cookie, which JavaScript can't read.
export async function login(email: string, password: string): Promise<void> {
  await apiPostForm("/auth/login", { username: email, password });
}

export async function logout(): Promise<void> {
  await apiPostForm("/auth/logout", {});
}

/** The logged-in admin, or null when not logged in (401 is not an error here). */
export async function fetchMe(): Promise<Admin | null> {
  try {
    return await apiGet<Admin>("/auth/me");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}
