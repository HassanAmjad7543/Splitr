import "server-only";

import { randomBytes } from "node:crypto";

/**
 * Share tokens act like passwords: anyone holding one can read that member's
 * view without logging in. 24 random bytes = 192 bits of entropy, encoded as
 * 32 URL-safe characters. The unique constraint on members.share_token is the
 * backstop against the (astronomically unlikely) collision.
 */
export function generateShareToken(): string {
  return randomBytes(24).toString("base64url");
}

/** Cheap format check before we ever hit the database with a token. */
export function isWellFormedToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{32}$/.test(token);
}
