import "server-only";

import { cache } from "react";

import { computeBalances, type Balance } from "@/lib/balances";
import { settle, type Transaction } from "@/lib/settle";
import { createClient } from "@/lib/supabase/server";
import { byName, isUuid } from "@/lib/utils";
import type { Expense, Member } from "@/types";

export type GroupSummary = {
  id: string;
  name: string;
  createdAt: string;
  memberCount: number;
  expenseCount: number;
  totalSpent: number;
};

/** Dashboard: every group the logged-in organizer owns (RLS does the filtering). */
export async function listGroups(): Promise<GroupSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("groups")
    .select("id, name, created_at, members(count), expenses(amount)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Couldn't load groups: ${error.message}`);

  return data.map((g) => ({
    id: g.id,
    name: g.name,
    createdAt: g.created_at,
    memberCount: g.members[0]?.count ?? 0,
    expenseCount: g.expenses.length,
    totalSpent: g.expenses.reduce((acc, e) => acc + e.amount, 0),
  }));
}

export type GroupDetail = {
  id: string;
  name: string;
  members: Member[];
  expenses: Expense[];
  balances: Balance[];
  settlements: Transaction[];
};

/**
 * Group page: members, expenses with splits, balances and the settlement plan.
 * Wrapped in cache() so generateMetadata and the page share one fetch per request.
 */
export const getGroupDetail = cache(async (groupId: string): Promise<GroupDetail | null> => {
  if (!isUuid(groupId)) return null;
  const supabase = await createClient();

  const [groupRes, membersRes, expensesRes] = await Promise.all([
    supabase.from("groups").select("id, name").eq("id", groupId).maybeSingle(),
    supabase.from("members").select("id, name, share_token").eq("group_id", groupId),
    supabase
      .from("expenses")
      .select("id, amount, paid_by, split_type, note, date, created_at, expense_splits(member_id, amount_owed, percent_bp)")
      .eq("group_id", groupId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  if (groupRes.error) throw new Error(`Couldn't load group: ${groupRes.error.message}`);
  if (!groupRes.data) return null; // doesn't exist, or belongs to someone else
  if (membersRes.error) throw new Error(`Couldn't load members: ${membersRes.error.message}`);
  if (expensesRes.error) throw new Error(`Couldn't load expenses: ${expensesRes.error.message}`);

  const members: Member[] = membersRes.data
    .map((m) => ({ id: m.id, name: m.name, shareToken: m.share_token }))
    .sort(byName);

  const expenses: Expense[] = expensesRes.data.map((e) => ({
    id: e.id,
    amount: e.amount,
    paidBy: e.paid_by,
    splitType: e.split_type,
    note: e.note,
    date: e.date,
    createdAt: e.created_at,
    splits: e.expense_splits.map((s) => ({
      memberId: s.member_id,
      amountOwed: s.amount_owed,
      percentBp: s.percent_bp,
    })),
  }));

  const balances = computeBalances(
    members.map((m) => m.id),
    expenses.map((e) => ({
      paidBy: e.paidBy,
      amount: e.amount,
      splits: e.splits.map((s) => ({ memberId: s.memberId, amountOwed: s.amountOwed })),
    })),
  );

  let settlements: Transaction[] = [];
  try {
    settlements = settle(balances);
  } catch (err) {
    console.error("[group] settlement failed", err);
  }

  return { id: groupRes.data.id, name: groupRes.data.name, members, expenses, balances, settlements };
});
