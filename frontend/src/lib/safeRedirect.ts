/**
 * Only allow same-site paths as a post-login redirect target. Without this,
 * /admin/login?next=https://evil.example would bounce admins to a phishing
 * page right after they log in (an "open redirect").
 */
export function safeRedirect(next: string | null, fallback = "/admin"): string {
  // "/x" is a local path; "//evil.example" and "/\evil" are protocol-relative URLs.
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}
