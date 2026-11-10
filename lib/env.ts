// NEXT_PUBLIC_* values must be referenced literally so Next.js can inline them
// into the browser bundle.

export function supabaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL — copy .env.example to .env.local");
  return value;
}

export function supabaseAnonKey(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!value) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY — copy .env.example to .env.local");
  return value;
}
