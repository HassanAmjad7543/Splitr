/**
 * Split math: turn one expense total into per-member shares.
 *
 * All inputs and outputs are integer paisa. The one invariant every function
 * here guarantees — and the tests check for many random inputs — is:
 *
 *     sum(shares) === total, exactly.
 *
 * If that ever breaks, fix it here. The settlement algorithm relies on it.
 *
 * Rounding convention: dividing 100 paisa three ways gives 33 + 33 + 34, not
 * 33.33 three times. The leftover paisa go to the payer when the payer is part
 * of the split (they're already out the money, so the extra paisa simply stays
 * with them). If the payer isn't in the split, the leftovers are handed out one
 * paisa at a time in a deterministic order.
 */

export type SplitType = "equal" | "exact" | "percentage";

export const SPLIT_TYPES: { value: SplitType; label: string }[] = [
  { value: "equal", label: "Equal" },
  { value: "exact", label: "Exact amounts" },
  { value: "percentage", label: "Percentage" },
];

export type Share = {
  memberId: string;
  /** What this member owes for the expense, in paisa. */
  amount: number;
  /** For percentage splits: the percentage in basis points (1% = 100 bp). */
  basisPoints?: number;
};

export class SplitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SplitError";
  }
}

function assertPositiveTotal(total: number) {
  if (!Number.isSafeInteger(total) || total <= 0) {
    throw new SplitError("Amount must be a positive whole number of paisa");
  }
}

function assertUnique(memberIds: string[]) {
  if (new Set(memberIds).size !== memberIds.length) {
    throw new SplitError("A member can only appear once in a split");
  }
}

/** Split `total` equally between `memberIds`. */
export function splitEqual(total: number, memberIds: string[], payerId: string): Share[] {
  assertPositiveTotal(total);
  if (memberIds.length === 0) {
    throw new SplitError("Pick at least one person to split with");
  }
  assertUnique(memberIds);

  const count = memberIds.length;
  const base = Math.floor(total / count);
  let remainder = total - base * count; // always 0 <= remainder < count

  const shares = memberIds.map((memberId) => ({ memberId, amount: base }));

  const payerShare = shares.find((s) => s.memberId === payerId);
  if (payerShare) {
    payerShare.amount += remainder;
    remainder = 0;
  }
  // Payer not in the split: hand out the leftover paisa one by one, in list order.
  for (let i = 0; remainder > 0; i++, remainder--) {
    shares[i].amount += 1;
  }

  return shares;
}

/** Each member owes exactly what was typed. The amounts must add up to `total`. */
export function splitExact(total: number, entries: { memberId: string; amount: number }[]): Share[] {
  assertPositiveTotal(total);
  const shares = entries.filter((e) => e.amount !== 0);
  if (shares.length === 0) {
    throw new SplitError("Enter an amount for at least one person");
  }
  assertUnique(shares.map((s) => s.memberId));
  for (const s of shares) {
    if (!Number.isSafeInteger(s.amount) || s.amount < 0) {
      throw new SplitError("Amounts can't be negative");
    }
  }

  const sum = shares.reduce((acc, s) => acc + s.amount, 0);
  if (sum !== total) {
    throw new SplitError(
      sum < total
        ? `Amounts are ${total - sum} paisa short of the total`
        : `Amounts are ${sum - total} paisa over the total`,
    );
  }
  return shares.map((s) => ({ memberId: s.memberId, amount: s.amount }));
}

/**
 * Split by percentage. Percentages are given in basis points (integers,
 * 10000 = 100%) so they can carry two decimals without floats.
 */
export function splitByPercentage(
  total: number,
  entries: { memberId: string; basisPoints: number }[],
  payerId: string,
): Share[] {
  assertPositiveTotal(total);
  const parts = entries.filter((e) => e.basisPoints !== 0);
  if (parts.length === 0) {
    throw new SplitError("Enter a percentage for at least one person");
  }
  assertUnique(parts.map((p) => p.memberId));
  for (const p of parts) {
    if (!Number.isSafeInteger(p.basisPoints) || p.basisPoints < 0) {
      throw new SplitError("Percentages can't be negative");
    }
  }
  const totalBp = parts.reduce((acc, p) => acc + p.basisPoints, 0);
  if (totalBp !== 10_000) {
    throw new SplitError(`Percentages add up to ${formatBasisPoints(totalBp)}%, not 100%`);
  }

  // Floor every share first. Each floor drops less than one paisa, so the
  // total shortfall is always smaller than the number of participants.
  const shares = parts.map((p) => {
    const exact = total * p.basisPoints; // in 1/10000ths of a paisa
    return {
      memberId: p.memberId,
      basisPoints: p.basisPoints,
      amount: Math.floor(exact / 10_000),
      leftover: exact % 10_000,
    };
  });
  let remainder = total - shares.reduce((acc, s) => acc + s.amount, 0);

  const payerShare = shares.find((s) => s.memberId === payerId);
  if (payerShare) {
    payerShare.amount += remainder;
    remainder = 0;
  }
  // Otherwise use the largest-remainder method: whoever lost the most to
  // flooring gets a paisa back first. Ties keep list order (sort is stable).
  const byLeftover = [...shares].sort((a, b) => b.leftover - a.leftover);
  for (let i = 0; remainder > 0; i++, remainder--) {
    byLeftover[i].amount += 1;
  }

  return shares.map(({ memberId, amount, basisPoints }) => ({ memberId, amount, basisPoints }));
}

/** "33.5" -> 3350 basis points. Up to two decimals, 0–100. Empty string -> 0. */
export function parsePercentToBasisPoints(input: string): number {
  const cleaned = input.trim().replace(/%$/, "").trim();
  if (cleaned === "") return 0;
  const match = /^(\d*)(?:\.(\d{0,2}))?$/.exec(cleaned);
  if (!match || (match[1] === "" && !match[2])) {
    throw new SplitError("Percentages look like 25 or 33.33");
  }
  const bp = Number(match[1] || "0") * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  if (bp > 10_000) throw new SplitError("A percentage can't be more than 100");
  return bp;
}

/** 3350 -> "33.5", 10000 -> "100". */
export function formatBasisPoints(bp: number): string {
  const whole = Math.floor(bp / 100);
  const frac = bp % 100;
  if (frac === 0) return String(whole);
  return `${whole}.${String(frac).padStart(2, "0").replace(/0$/, "")}`;
}
