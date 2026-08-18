import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth/session";

/**
 * Next 16 renamed `middleware` to `proxy` (nodejs runtime, not configurable).
 *
 * This is a UX gate only: it checks the cookie signature so signed-out visitors
 * get redirected to the sign-in screen instead of a flash of the admin shell.
 * It deliberately does NOT hit the database.
 *
 * Real authorization lives in `getAdmin()`, which every admin page and every
 * mutating route handler calls independently — it re-checks the env allowlist
 * and the stored sessionVersion. Never rely on this file alone for access
 * control.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The sign-in screen itself must stay reachable while signed out.
  if (pathname.startsWith("/admin/signin")) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;

  let valid = false;
  try {
    valid = token ? verifySessionToken(token) !== null : false;
  } catch {
    // A missing/short AUTH_SECRET throws — treat as signed out rather than 500.
    valid = false;
  }

  if (!valid) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/signin";
    url.search = pathname === "/admin" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
