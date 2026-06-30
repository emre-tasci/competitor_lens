import { NextRequest, NextResponse } from "next/server";

// Protect the /admin UI and all data-mutating admin APIs with HTTP Basic Auth.
// Set ADMIN_PASSWORD (and optionally ADMIN_USER, default "admin") in the env.
// Public GET endpoints stay open so the public site keeps working.

const PROTECTED_PAGE = /^\/admin(\/|$)/;
// Always require auth (any method):
const ALWAYS_PROTECTED_API = [
  /^\/api\/screenshots\/sync(\/|$)/,
  /^\/api\/screenshots\/upload(\/|$)/,
];
// Require auth only for mutating methods (POST/PUT/PATCH/DELETE):
const MUTATING_PROTECTED_API = [
  /^\/api\/exchanges(\/|$)/,
  /^\/api\/features(\/|$)/,
  /^\/api\/screenshots(\/|$)/,
  /^\/api\/matrix\/import(\/|$)/,
  /^\/api\/updates(\/|$)/,
];

function unauthorized() {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Admin", charset="UTF-8"' },
  });
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;

  const isPage = PROTECTED_PAGE.test(pathname);
  const isAlwaysApi = ALWAYS_PROTECTED_API.some((r) => r.test(pathname));
  const isMutatingApi =
    !["GET", "HEAD", "OPTIONS"].includes(method) &&
    MUTATING_PROTECTED_API.some((r) => r.test(pathname));

  if (!isPage && !isAlwaysApi && !isMutatingApi) {
    return NextResponse.next();
  }

  const expected = process.env.ADMIN_PASSWORD;
  // If no password is configured, do not lock the user out — but the admin
  // area is then effectively open. Set ADMIN_PASSWORD to enable protection.
  if (!expected) return NextResponse.next();

  const header = req.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const sep = decoded.indexOf(":");
      const pass = sep >= 0 ? decoded.slice(sep + 1) : decoded;
      if (pass === expected) return NextResponse.next();
    } catch {
      // fall through to 401
    }
  }
  return unauthorized();
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
