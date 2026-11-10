import type { PostgrestError } from "@supabase/supabase-js";

/** Turn a Postgres/PostgREST error into something an organizer can act on. */
export function friendlyDbError(error: PostgrestError, fallback = "Something went wrong. Please try again."): string {
  switch (error.code) {
    case "23505": // unique_violation
      if (error.message.includes("idx_members_group_name")) return "Someone with that name is already in this group.";
      return "That already exists.";
    case "23503": // foreign_key_violation
      return "That member is part of existing expenses. Edit or delete those expenses first.";
    case "23514": // check_violation
      return "Some of the values aren't allowed. Check names and amounts.";
    case "P0001": // raise exception from our SQL functions/triggers
      return error.message;
    case "42501": // insufficient_privilege (RLS)
      return "You don't have access to that.";
    default:
      console.error("[db]", error);
      return fallback;
  }
}
