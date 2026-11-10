/**
 * The bridge between the expense form and the split math. Shared by the form
 * (live preview) and the server action (authoritative save), so both always
 * agree on the numbers.
 */

import { parseRupeesToPaisa } from "@/lib/money";
import {
  parsePercentToBasisPoints,
  splitByPercentage,
  splitEqual,
  splitExact,
  type Share,
  type SplitType,
} from "@/lib/splits";

export type ExpenseDraft = {
  /** What the organizer typed, e.g. "1500" or "1,234.50". */
  amount: string;
  paidBy: string;
  splitType: SplitType;
  note: string;
  /** YYYY-MM-DD */
  date: string;
  /** Members ticked for an equal split. */
  equalMemberIds: string[];
  /** Typed rupee amounts per member, for exact splits. */
  exactAmounts: Record<string, string>;
  /** Typed percentages per member, for percentage splits. */
  percentages: Record<string, string>;
};

export type BuiltShares = { ok: true; amount: number; shares: Share[] } | { ok: false; error: string };

export function buildShares(draft: ExpenseDraft): BuiltShares {
  try {
    if (!draft.paidBy) return { ok: false, error: "Who paid?" };
    const amount = parseRupeesToPaisa(draft.amount);

    switch (draft.splitType) {
      case "equal":
        return { ok: true, amount, shares: splitEqual(amount, draft.equalMemberIds, draft.paidBy) };

      case "exact": {
        const entries = Object.entries(draft.exactAmounts)
          .filter(([, value]) => value.trim() !== "")
          .map(([memberId, value]) => ({ memberId, amount: parseExactShare(value) }));
        return { ok: true, amount, shares: splitExact(amount, entries) };
      }

      case "percentage": {
        const entries = Object.entries(draft.percentages).map(([memberId, value]) => ({
          memberId,
          basisPoints: parsePercentToBasisPoints(value),
        }));
        return { ok: true, amount, shares: splitByPercentage(amount, entries, draft.paidBy) };
      }

      default:
        return { ok: false, error: "Pick how to split it." };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Check the amounts." };
  }
}

/** Exact shares may legitimately be "0"; everything else goes through the normal parser. */
function parseExactShare(value: string): number {
  if (/^\s*0*(\.0*)?\s*$/.test(value)) return 0;
  return parseRupeesToPaisa(value);
}
