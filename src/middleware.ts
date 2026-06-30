import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, adminToken } from "@/lib/adminToken";

// Cookie-based auth: protects the /admin UI and data-mutating admin APIs.
// The session cookie is set by /api/admin/login. Same-origin fetch() requests
// from the admin pages include the cookie automatically. Set ADMIN_PASSWORD to
// enable protection. Public GET endpoints stay open.

const PROTECTED_PAGE = /^\/admin(\/|$)/;
const ALWAYS_PROTECTED_API = [
  /^\/api\/screenshots\/sync(\/|$)/,
  /^\/api\/screenshots\/upload(\/|$)/,
];
const MUTATING_PROTECTED_API = [
  /^\/api\/exchanges(\/|$)/,
  /^\/api\/features(\/|$)/,
  /^\/api\/screenshots(\/|$)/,
  /^\/api\/matrix\/import(\/|$)/,
  /^\/api\/updates(\/|$)/,
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;

  // Login page + login API are always reachable.
  if (pathname === "/admin/login" || pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  const isPage = PROTECTED_PAGE.test(pathname);
  const isAlwaysApi = ALWAYS_PROTECTED_API.some((r) => r.test(pathname));
  const isMutatingApi =
    !["GET", "HEAD", "OPTIONS"].includes(method) &&
    MUTATING_PROTECTED_API.some((r) => r.test(pathname));

  if (!isPage && !isAlwaysApi && !isMutatingApi) {
    return NextResponse.next();
  }

  const expected = process.env.ADMIN_PASSWORD;
  // If no password is configured, don't lock anyone out.
  if (!expected) return NextResponse.next();

  const cookie = req.cookies.get(ADMIN_COOKIE)?.value;
  if (cookie && cookie === (await adminToken(expected))) {
    return NextResponse.next();
  }

  if (isPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
