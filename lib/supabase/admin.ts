import "server-only";

import { createClient } from "@supabase/supabase-js";

import { supabaseUrl } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Service-role client. BYPASSES ROW LEVEL SECURITY.
 *
 * Server-only (the "server-only" import makes the build fail if a client
 * component ever imports this file). Its single job is serving share links:
 * lib/share.ts looks a member up by token and returns a hand-shaped response.
 * Never pass rows from this client straight to the browser.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY — share links need it on the server");
  }
  return createClient<Database>(supabaseUrl(), serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
