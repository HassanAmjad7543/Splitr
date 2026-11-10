import type { SplitType } from "@/lib/splits";

export type { SplitType };

export type Member = {
  id: string;
  name: string;
  shareToken: string;
};

export type ExpenseSplit = {
  memberId: string;
  amountOwed: number;
  percentBp: number | null;
};

export type Expense = {
  id: string;
  amount: number;
  paidBy: string;
  splitType: SplitType;
  note: string | null;
  date: string;
  createdAt: string;
  splits: ExpenseSplit[];
};

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; error: string };

/** Everything a share link is allowed to reveal. Built in lib/share.ts. */
export type ShareView = {
  groupName: string;
  member: {
    name: string;
    /** Net balance in paisa: positive = is owed, negative = owes. */
    balance: number;
    totalPaid: number;
    totalShare: number;
  };
  expenses: {
    amount: number;
    note: string | null;
    date: string;
    paidByName: string;
    paidByMe: boolean;
    /** This member's share of the expense (0 if they only paid). */
    myShare: number;
    splitType: SplitType;
    /** Names of everyone in the split, this member included. */
    splitWith: string[];
  }[];
  /** Only the settlement rows that involve this member. */
  settlements: {
    direction: "pay" | "receive";
    otherName: string;
    amount: number;
  }[];
};
