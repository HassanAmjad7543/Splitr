/**
 * Per-member net balance.
 *
 *     net = (everything this member paid) − (everything this member owes)
 *
 * Positive: the group owes them money. Negative: they owe the group.
 * Across a whole group the balances always sum to exactly zero, because every
 * paisa someone paid is owed by somebody (splits add up to the expense amount).
 */

export type Balance = {
  memberId: string;
  /** Net position in paisa. Positive = is owed, negative = owes. */
  amount: number;
};

export type ExpenseForBalance = {
  paidBy: string;
  amount: number;
  splits: { memberId: string; amountOwed: number }[];
};

export function computeBalances(memberIds: string[], expenses: ExpenseForBalance[]): Balance[] {
  const net = new Map<string, number>(memberIds.map((id) => [id, 0]));

  for (const expense of expenses) {
    net.set(expense.paidBy, (net.get(expense.paidBy) ?? 0) + expense.amount);
    for (const split of expense.splits) {
      net.set(split.memberId, (net.get(split.memberId) ?? 0) - split.amountOwed);
    }
  }

  const balances = [...net.entries()].map(([memberId, amount]) => ({ memberId, amount }));

  const sum = balances.reduce((acc, b) => acc + b.amount, 0);
  if (sum !== 0) {
    // Should be impossible: the database rejects expenses whose splits don't
    // add up. If it happens anyway, something upstream has a rounding bug.
    console.warn(`[balances] balances sum to ${sum} paisa instead of 0`);
  }

  return balances;
}

/** Totals for one member — handy for the share page. */
export function memberTotals(memberId: string, expenses: ExpenseForBalance[]) {
  let paid = 0;
  let share = 0;
  for (const expense of expenses) {
    if (expense.paidBy === memberId) paid += expense.amount;
    for (const split of expense.splits) {
      if (split.memberId === memberId) share += split.amountOwed;
    }
  }
  return { paid, share, net: paid - share };
}
