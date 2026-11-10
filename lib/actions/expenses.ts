"use server";

import { revalidatePath } from "next/cache";

import { friendlyDbError } from "@/lib/actions/errors";
import { buildShares, type ExpenseDraft } from "@/lib/expense-draft";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils";
import type { ActionResult } from "@/types";

/**
 * Create or update an expense.
 *
 * The client sends what the organizer typed (rupee strings, percentages); the
 * split math runs again here on the server — the browser's numbers are only a
 * preview and are never trusted. The save itself is one RPC call, so the
 * expense and its splits are written atomically.
 */
export async function saveExpense(groupId: string, draft: ExpenseDraft, expenseId?: string): Promise<ActionResult> {
  if (!isUuid(groupId)) return { ok: false, error: "Group not found." };
  if (expenseId !== undefined && !isUuid(expenseId)) return { ok: false, error: "Expense not found." };

  const built = buildShares(draft);
  if (!built.ok) return { ok: false, error: built.error };
  const { amount, shares } = built;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date) || Number.isNaN(Date.parse(draft.date))) {
    return { ok: false, error: "Pick a valid date." };
  }
  const note = draft.note.trim();
  if (note.length > 200) return { ok: false, error: "Keep the note under 200 characters." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_expense", {
    p_expense_id: expenseId ?? null,
    p_group_id: groupId,
    p_amount: amount,
    p_paid_by: draft.paidBy,
    p_split_type: draft.splitType,
    p_note: note || null,
    p_date: draft.date,
    p_splits: shares.map((s) => ({
      member_id: s.memberId,
      amount_owed: s.amount,
      percent_bp: s.basisPoints ?? null,
    })),
  });
  if (error) return { ok: false, error: friendlyDbError(error, "Couldn't save the expense.") };

  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/groups");
  return { ok: true };
}

export async function deleteExpense(groupId: string, expenseId: string): Promise<ActionResult> {
  if (!isUuid(groupId) || !isUuid(expenseId)) return { ok: false, error: "Expense not found." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId)
    .eq("group_id", groupId)
    .select("id");
  if (error) return { ok: false, error: friendlyDbError(error, "Couldn't delete the expense.") };
  if (data.length === 0) return { ok: false, error: "Expense not found." };

  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/groups");
  return { ok: true };
}
