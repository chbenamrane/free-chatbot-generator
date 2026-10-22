// The proxy runs BEFORE every admin page. It is only a fast first barrier: without a session cookie the
// visitor is sent to the sign-in page. The real check (against the database) happens in each page and action.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { LOGIN_PATH, SESSION_COOKIE, SETUP_PATH } from "@/lib/auth/constants";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = [LOGIN_PATH, SETUP_PATH].some((p) => pathname === p || pathname === `${p}/`);
  if (!isPublic && !request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  const response = NextResponse.next();
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
