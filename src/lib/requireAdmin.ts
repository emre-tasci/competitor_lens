import { NextRequest } from "next/server";
import { ADMIN_COOKIE, adminToken } from "@/lib/adminToken";

/**
 * Server-side admin guard for the classification write/export routes.
 *
 * Mirrors the cookie-based scheme used by the existing middleware
 * (`src/middleware.ts` + `/api/admin/login`): the session cookie is a
 * deterministic SHA-256 of the admin password. We validate it here because the
 * new `/api/classifications/*` paths are not in the middleware's protected
 * lists and we are only allowed to ADD files (not edit middleware).
 *
 * If `ADMIN_PASSWORD` is not configured we allow the request, matching the
 * middleware's "don't lock anyone out" behaviour.
 *
 * @returns null when authorised, or a reason string when denied.
 */
export async function requireAdmin(req: NextRequest): Promise<string | null> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return null;

  const cookie = req.cookies.get(ADMIN_COOKIE)?.value;
  if (cookie && cookie === (await adminToken(expected))) return null;

  return "Unauthorized";
}
