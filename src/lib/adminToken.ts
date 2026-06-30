// Shared helpers for cookie-based admin auth. Edge-compatible (Web Crypto only).
export const ADMIN_COOKIE = "admin_session";

// Deterministic token derived from the admin password, so middleware can
// validate the session cookie without any session store.
export async function adminToken(password: string): Promise<string> {
  const data = new TextEncoder().encode("cl-admin:" + password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
