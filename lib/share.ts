import "server-only";

import { computeBalances, memberTotals } from "@/lib/balances";
import { settle } from "@/lib/settle";
import { createAdminClient } from "@/lib/supabase/admin";
import { isWellFormedToken } from "@/lib/tokens";
import type { ShareView } from "@/types";

/**
 * Everything behind a share link, read with the service-role key.
 *
 * The token bypasses auth, so this function is the privacy boundary. It returns
 * a hand-shaped object containing ONLY:
 *   - the group name
 *   - this member's name and own balance
 *   - the expenses this member paid for or is part of (names only for others)
 *   - the settlement rows that involve this member
 *
 * It never returns: other members' balances, ids or tokens, the organizer's
 * id or email, or any expense this member isn't attached to.
 *
 * Used by both /share/[token] (server component) and /api/share/[token].
 */
export async function getShareView(token: string): Promise<ShareView | null> {
  if (!isWellFormedToken(token)) return null;

  const admin = createAdminClient();

  const { data: member, error: memberError } = await admin
    .from("members")
    .select("id, name, group_id")
    .eq("share_token", token)
    .maybeSingle();
  if (memberError) throw new Error(`Share lookup failed: ${memberError.message}`);
  if (!member) return null;

  const [groupRes, membersRes, expensesRes] = await Promise.all([
    admin.from("groups").select("name").eq("id", member.group_id).single(),
    admin.from("members").select("id, name").eq("group_id", member.group_id),
    admin
      .from("expenses")
      .select("amount, paid_by, split_type, note, date, created_at, expense_splits(member_id, amount_owed)")
      .eq("group_id", member.group_id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);
  if (groupRes.error) throw new Error(`Share lookup failed: ${groupRes.error.message}`);
  if (membersRes.error) throw new Error(`Share lookup failed: ${membersRes.error.message}`);
  if (expensesRes.error) throw new Error(`Share lookup failed: ${expensesRes.error.message}`);

  const nameOf = new Map(membersRes.data.map((m) => [m.id, m.name]));

  const ledger = expensesRes.data.map((e) => ({
    paidBy: e.paid_by,
    amount: e.amount,
    splits: e.expense_splits.map((s) => ({ memberId: s.member_id, amountOwed: s.amount_owed })),
  }));

  // The whole group's balances are needed to compute the settlement plan, but
  // they stay on the server. Only rows involving this member go out.
  const allBalances = computeBalances([...nameOf.keys()], ledger);
  let settlements: ShareView["settlements"] = [];
  try {
    settlements = settle(allBalances)
      .filter((tx) => tx.from === member.id || tx.to === member.id)
      .map((tx) =>
        tx.from === member.id
          ? { direction: "pay" as const, otherName: nameOf.get(tx.to) ?? "Someone", amount: tx.amount }
          : { direction: "receive" as const, otherName: nameOf.get(tx.from) ?? "Someone", amount: tx.amount },
      );
  } catch (err) {
    console.error("[share] settlement failed", err);
  }

  const totals = memberTotals(member.id, ledger);

  // Only expenses this member paid for or is part of.
  const expenses: ShareView["expenses"] = expensesRes.data
    .filter((e) => e.paid_by === member.id || e.expense_splits.some((s) => s.member_id === member.id))
    .map((e) => ({
      amount: e.amount,
      note: e.note,
      date: e.date,
      splitType: e.split_type,
      paidByName: nameOf.get(e.paid_by) ?? "Someone",
      paidByMe: e.paid_by === member.id,
      myShare: e.expense_splits.find((s) => s.member_id === member.id)?.amount_owed ?? 0,
      splitWith: e.expense_splits.map((s) => nameOf.get(s.member_id) ?? "Someone"),
    }));

  return {
    groupName: groupRes.data.name,
    member: {
      name: member.name,
      balance: totals.net,
      totalPaid: totals.paid,
      totalShare: totals.share,
    },
    expenses,
    settlements,
  };
}
