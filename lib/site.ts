export const site = {
  name: "Splitr",
  tagline: "Who owes who what",
  description:
    "Split group expenses without making everyone sign up. One organizer logs expenses; everyone else gets a read-only link to their balance.",
};

/** Absolute site URL for metadata/OG tags. Set NEXT_PUBLIC_SITE_URL in production. */
export function siteUrl(): URL {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
  return new URL(fromEnv ?? "http://localhost:3000");
}
