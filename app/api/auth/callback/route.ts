import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * OAuth + email-confirmation landing route. Supabase redirects here with a
 * one-time `code`, which we swap for a session cookie.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/groups";
  // Only ever redirect to a path on this site.
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/groups";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, origin));
  }

  const description = searchParams.get("error_description") ?? "Sign-in link was invalid or expired.";
  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(description)}`, origin));
}
