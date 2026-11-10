/**
 * The settlement algorithm.
 *
 * Problem: given everyone's net balance, find a short list of
 * "X pays Y amount" transactions after which every balance is zero.
 *
 * Example. Alice paid 1500 for dinner, Bob paid 900 for petrol, Charlie paid
 * 600 for parking, each split equally three ways. Paying back every share
 * individually takes six transfers. Netting first:
 *
 *     Alice   paid 1500, her shares 500 + 300 + 200 = 1000  ->  +500
 *     Bob     paid  900, his shares 500 + 300 + 200 = 1000  ->  -100
 *     Charlie paid  600, his shares 500 + 300 + 200 = 1000  ->  -400
 *
 * and settling the nets takes two: Charlie pays Alice 400, Bob pays Alice 100.
 *
 * Approach (greedy):
 *   1. Split members into creditors (balance > 0) and debtors (balance < 0).
 *      People already at zero need no transfers at all.
 *   2. Match the biggest debtor with the biggest creditor. The debtor pays
 *      min(|debt|, credit). Whoever reaches zero leaves their pile.
 *   3. Repeat until both piles are empty. Because balances sum to zero, the
 *      two piles always run out at the same moment.
 *
 * Why it's good: every transfer takes at least one person to zero, so N
 * people with non-zero balances never need more than N − 1 transfers.
 *
 * Honest caveat (a good one to raise in an interview): N − 1 is the true
 * minimum only when no smaller subgroup's balances cancel out on their own.
 * If, say, A is +300 and B is −300 inside a bigger group, the best plan settles
 * that pair separately and saves a transfer. Finding the absolute minimum in
 * general is NP-hard (it's a subset-sum style partitioning problem). Greedy
 * stays within N − 1, runs instantly, and for a dinner group it's either
 * optimal or one transfer off.
 *
 * Cost: we re-sort both piles every round. N is the size of a friend group,
 * so O(N² log N) is nothing — a heap would be premature.
 */

import type { Balance } from "./balances";

export type { Balance } from "./balances";

export type Transaction = {
  /** Member who pays. */
  from: string;
  /** Member who receives. */
  to: string;
  /** Paisa, always > 0. */
  amount: number;
};

export function settle(balances: Balance[]): Transaction[] {
  // Sanity check first. Balances that don't sum to zero mean a split or
  // rounding bug somewhere upstream, and no set of transfers could fix it.
  const sum = balances.reduce((acc, b) => acc + b.amount, 0);
  if (sum !== 0) {
    throw new Error(`Balances don't sum to zero: ${sum}`);
  }
  for (const b of balances) {
    if (!Number.isSafeInteger(b.amount)) {
      throw new Error(`Balance for ${b.memberId} is not a whole number of paisa: ${b.amount}`);
    }
  }

  // Working copies, so the caller's array is never mutated.
  const creditors = balances.filter((b) => b.amount > 0).map((b) => ({ ...b }));
  const debtors = balances.filter((b) => b.amount < 0).map((b) => ({ ...b }));

  const transactions: Transaction[] = [];

  while (creditors.length > 0 && debtors.length > 0) {
    // Biggest claim first. Ties break on memberId so the same balances always
    // produce the same plan (no "the plan changed when I refreshed" moments).
    creditors.sort((a, b) => b.amount - a.amount || a.memberId.localeCompare(b.memberId));
    debtors.sort((a, b) => a.amount - b.amount || a.memberId.localeCompare(b.memberId)); // most negative first

    const creditor = creditors[0];
    const debtor = debtors[0];
    const payment = Math.min(creditor.amount, -debtor.amount);

    transactions.push({ from: debtor.memberId, to: creditor.memberId, amount: payment });

    creditor.amount -= payment;
    debtor.amount += payment;

    // At least one of these is now zero, which is what guarantees progress.
    if (creditor.amount === 0) creditors.shift();
    if (debtor.amount === 0) debtors.shift();
  }

  return transactions;
}
