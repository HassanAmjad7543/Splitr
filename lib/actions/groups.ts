"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { friendlyDbError } from "@/lib/actions/errors";
import { createClient } from "@/lib/supabase/server";
import { generateShareToken } from "@/lib/tokens";
import { isUuid } from "@/lib/utils";
import type { ActionResult } from "@/types";

const MAX_GROUP_NAME = 80;
const MAX_MEMBER_NAME = 60;
const MAX_MEMBERS = 50;

function cleanName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

/** Parse the "one name per line" textarea. Returns names or an error message. */
function parseMemberNames(raw: string): string[] | string {
  const names = raw.split(/\r?\n/).map(cleanName).filter(Boolean);
  if (names.length === 0) return "Add at least one member.";
  if (names.length > MAX_MEMBERS) return `A group can have at most ${MAX_MEMBERS} members.`;
  const tooLong = names.find((n) => n.length > MAX_MEMBER_NAME);
  if (tooLong) return `"${tooLong.slice(0, 20)}…" is too long. Keep names under ${MAX_MEMBER_NAME} characters.`;
  const seen = new Set<string>();
  for (const name of names) {
    const key = name.toLowerCase();
    if (seen.has(key)) return `"${name}" is listed twice.`;
    seen.add(key);
  }
  return names;
}

function validateGroupName(raw: string): string | { error: string } {
  const name = cleanName(raw);
  if (!name) return { error: "Give the group a name." };
  if (name.length > MAX_GROUP_NAME) return { error: `Keep the name under ${MAX_GROUP_NAME} characters.` };
  return name;
}

export async function createGroup(input: { name: string; members: string }): Promise<ActionResult> {
  const name = validateGroupName(input.name);
  if (typeof name !== "string") return { ok: false, error: name.error };
  const names = parseMemberNames(input.members);
  if (typeof names === "string") return { ok: false, error: names };

  const supabase = await createClient();
  const { data: groupId, error } = await supabase.rpc("create_group", {
    p_name: name,
    p_members: names.map((n) => ({ name: n, share_token: generateShareToken() })),
  });
  if (error) return { ok: false, error: friendlyDbError(error, "Couldn't create the group.") };

  revalidatePath("/groups");
  redirect(`/groups/${groupId}`);
}

export async function renameGroup(groupId: string, rawName: string): Promise<ActionResult> {
  if (!isUuid(groupId)) return { ok: false, error: "Group not found." };
  const name = validateGroupName(rawName);
  if (typeof name !== "string") return { ok: false, error: name.error };

  const supabase = await createClient();
  const { data, error } = await supabase.from("groups").update({ name }).eq("id", groupId).select("id");
  if (error) return { ok: false, error: friendlyDbError(error) };
  if (data.length === 0) return { ok: false, error: "Group not found." };

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  return { ok: true };
}

export async function deleteGroup(groupId: string): Promise<ActionResult> {
  if (!isUuid(groupId)) return { ok: false, error: "Group not found." };

  const supabase = await createClient();
  const { error } = await supabase.from("groups").delete().eq("id", groupId);
  if (error) return { ok: false, error: friendlyDbError(error, "Couldn't delete the group.") };

  revalidatePath("/groups");
  redirect("/groups");
}

export async function addMember(groupId: string, rawName: string): Promise<ActionResult> {
  if (!isUuid(groupId)) return { ok: false, error: "Group not found." };
  const name = cleanName(rawName);
  if (!name) return { ok: false, error: "Enter a name." };
  if (name.length > MAX_MEMBER_NAME) return { ok: false, error: "That name is too long." };

  const supabase = await createClient();
  const { count } = await supabase
    .from("members")
    .select("id", { count: "exact", head: true })
    .eq("group_id", groupId);
  if ((count ?? 0) >= MAX_MEMBERS) return { ok: false, error: `A group can have at most ${MAX_MEMBERS} members.` };

  const { error } = await supabase
    .from("members")
    .insert({ group_id: groupId, name, share_token: generateShareToken() });
  if (error) return { ok: false, error: friendlyDbError(error, "Couldn't add that member.") };

  revalidatePath(`/groups/${groupId}`);
  return { ok: true };
}

export async function renameMember(groupId: string, memberId: string, rawName: string): Promise<ActionResult> {
  if (!isUuid(groupId) || !isUuid(memberId)) return { ok: false, error: "Member not found." };
  const name = cleanName(rawName);
  if (!name) return { ok: false, error: "Enter a name." };
  if (name.length > MAX_MEMBER_NAME) return { ok: false, error: "That name is too long." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .update({ name })
    .eq("id", memberId)
    .eq("group_id", groupId)
    .select("id");
  if (error) return { ok: false, error: friendlyDbError(error) };
  if (data.length === 0) return { ok: false, error: "Member not found." };

  revalidatePath(`/groups/${groupId}`);
  return { ok: true };
}

/**
 * Deleting a member who appears in any expense (as payer or in a split) is
 * blocked rather than silently rewriting history. The organizer edits or
 * deletes those expenses first. The database enforces the same rule.
 */
export async function deleteMember(groupId: string, memberId: string): Promise<ActionResult> {
  if (!isUuid(groupId) || !isUuid(memberId)) return { ok: false, error: "Member not found." };
  const supabase = await createClient();

  const [paid, splits] = await Promise.all([
    supabase.from("expenses").select("id", { count: "exact", head: true }).eq("paid_by", memberId),
    supabase.from("expense_splits").select("id", { count: "exact", head: true }).eq("member_id", memberId),
  ]);
  const used = (paid.count ?? 0) + (splits.count ?? 0);
  if (used > 0) {
    return {
      ok: false,
      error: "This member is part of existing expenses. Edit or delete those expenses first.",
    };
  }

  const { error } = await supabase.from("members").delete().eq("id", memberId).eq("group_id", groupId);
  if (error) return { ok: false, error: friendlyDbError(error, "Couldn't remove that member.") };

  revalidatePath(`/groups/${groupId}`);
  return { ok: true };
}

/** Issue a fresh share token. The old link stops working immediately. */
export async function regenerateShareToken(groupId: string, memberId: string): Promise<ActionResult<{ token: string }>> {
  if (!isUuid(groupId) || !isUuid(memberId)) return { ok: false, error: "Member not found." };
  const token = generateShareToken();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .update({ share_token: token })
    .eq("id", memberId)
    .eq("group_id", groupId)
    .select("id");
  if (error) return { ok: false, error: friendlyDbError(error, "Couldn't reset the link.") };
  if (data.length === 0) return { ok: false, error: "Member not found." };

  revalidatePath(`/groups/${groupId}`);
  return { ok: true, data: { token } };
}
