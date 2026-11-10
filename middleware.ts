import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/** The one public address the production site should be reached on. */
const CANONICAL_HOST = (() => {
  try {
    return process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host : null;
  } catch {
    return null;
  }
})();

const IS_PRODUCTION = (process.env.VERCEL_ENV ?? process.env.NEXT_PUBLIC_VERCEL_ENV) === "production";

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;

  // 1. Production is served from one address. Requests to any other production
  //    hostname (e.g. the original *.vercel.app name) are redirected to the same
  //    path on the canonical one, so logins and cookies never end up split
  //    across two domains. Preview deployments and localhost are left alone.
  const host = request.headers.get("host");
  if (IS_PRODUCTION && CANONICAL_HOST && host && host !== CANONICAL_HOST) {
    const target = new URL(url.pathname + url.search, `https://${CANONICAL_HOST}`);
    return NextResponse.redirect(target, 308);
  }

  // 2. If Supabase can't match the requested redirect URL it falls back to the
  //    Site URL, which drops the one-time login code on the home page. Hand it
  //    to the callback route so the sign-in still completes.
  if (url.pathname === "/" && url.searchParams.has("code")) {
    const callback = url.clone();
    callback.pathname = "/api/auth/callback";
    if (!callback.searchParams.has("next")) callback.searchParams.set("next", "/groups");
    return NextResponse.redirect(callback);
  }

  return updateSession(request);
}

export const config = {
  // Everything except static assets and the public share pages/API, which
  // never need a session.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|opengraph-image|share/|api/share/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
