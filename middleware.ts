import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Everything except static assets and the public share pages/API, which
  // never need a session.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|opengraph-image|share/|api/share/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
