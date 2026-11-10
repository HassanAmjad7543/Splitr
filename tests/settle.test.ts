import { describe, expect, it } from "vitest";

import { computeBalances, type Balance } from "@/lib/balances";
import { settle, type Transaction } from "@/lib/settle";
import { splitEqual } from "@/lib/splits";

/** Apply transactions to balances and return what's left — should be all zeros. */
function applyTransactions(balances: Balance[], txs: Transaction[]): Map<string, number> {
  const remaining = new Map(balances.map((b) => [b.memberId, b.amount]));
  for (const tx of txs) {
    remaining.set(tx.from, (remaining.get(tx.from) ?? 0) + tx.amount);
    remaining.set(tx.to, (remaining.get(tx.to) ?? 0) - tx.amount);
  }
  return remaining;
}

function expectFullySettled(balances: Balance[], txs: Transaction[]) {
  for (const [, amount] of applyTransactions(balances, txs)) {
    expect(amount).toBe(0);
  }
  for (const tx of txs) {
    expect(tx.amount).toBeGreaterThan(0);
    expect(Number.isInteger(tx.amount)).toBe(true);
    expect(tx.from).not.toBe(tx.to);
  }
}

describe("settle", () => {
  it("settles the Alice / Bob / Charlie example in two transactions", () => {
    const members = ["alice", "bob", "charlie"];
    const expenses = [
      { paidBy: "alice", amount: 150_000, note: "dinner" },
      { paidBy: "bob", amount: 90_000, note: "petrol" },
      { paidBy: "charlie", amount: 60_000, note: "parking" },
    ].map((e) => ({
      paidBy: e.paidBy,
      amount: e.amount,
      splits: splitEqual(e.amount, members, e.paidBy).map((s) => ({
        memberId: s.memberId,
        amountOwed: s.amount,
      })),
    }));

    const balances = computeBalances(members, expenses);
    expect(balances).toEqual([
      { memberId: "alice", amount: 50_000 },
      { memberId: "bob", amount: -10_000 },
      { memberId: "charlie", amount: -40_000 },
    ]);

    const txs = settle(balances);
    expect(txs).toEqual([
      { from: "charlie", to: "alice", amount: 40_000 },
      { from: "bob", to: "alice", amount: 10_000 },
    ]);
    expectFullySettled(balances, txs);
  });

  it("needs at most four transactions for five people", () => {
    const balances: Balance[] = [
      { memberId: "ali", amount: 120_050 },
      { memberId: "sara", amount: -45_025 },
      { memberId: "hamza", amount: 30_000 },
      { memberId: "ayesha", amount: -80_000 },
      { memberId: "bilal", amount: -25_025 },
    ];
    const txs = settle(balances);
    expect(txs.length).toBeLessThanOrEqual(4);
    expectFullySettled(balances, txs);
  });

  it("matches the README's caveat example: greedy uses 4 transfers where 3 would do", () => {
    // Sara/Hamza cancel exactly, and Ali's +700 = Ayesha 400 + Bilal 300, so the
    // optimum is 3 transfers. Greedy doesn't look for those subgroups, so it
    // takes 4 (still within the N − 1 bound). Documented as a known trade-off.
    const balances: Balance[] = [
      { memberId: "Ali", amount: 70_000 },
      { memberId: "Sara", amount: 60_000 },
      { memberId: "Hamza", amount: -60_000 },
      { memberId: "Ayesha", amount: -40_000 },
      { memberId: "Bilal", amount: -30_000 },
    ];
    const txs = settle(balances);
    expect(txs).toEqual([
      { from: "Hamza", to: "Ali", amount: 60_000 },
      { from: "Ayesha", to: "Sara", amount: 40_000 },
      { from: "Bilal", to: "Sara", amount: 20_000 },
      { from: "Bilal", to: "Ali", amount: 10_000 },
    ]);
    expectFullySettled(balances, txs);
  });

  it("returns no transactions when everyone is already square", () => {
    expect(settle([])).toEqual([]);
    expect(
      settle([
        { memberId: "a", amount: 0 },
        { memberId: "b", amount: 0 },
        { memberId: "c", amount: 0 },
      ]),
    ).toEqual([]);
  });

  it("always produces exactly one transaction for two people", () => {
    for (const amount of [1, 99, 10_000, 123_456_789]) {
      const txs = settle([
        { memberId: "a", amount },
        { memberId: "b", amount: -amount },
      ]);
      expect(txs).toEqual([{ from: "b", to: "a", amount }]);
    }
  });

  it("throws when balances don't sum to zero", () => {
    expect(() =>
      settle([
        { memberId: "a", amount: 100 },
        { memberId: "b", amount: -99 },
      ]),
    ).toThrow(/sum to zero/);
  });

  it("does not mutate its input", () => {
    const balances: Balance[] = [
      { memberId: "a", amount: 500 },
      { memberId: "b", amount: -500 },
    ];
    const copy = structuredClone(balances);
    settle(balances);
    expect(balances).toEqual(copy);
  });

  it("is deterministic regardless of input order", () => {
    const balances: Balance[] = [
      { memberId: "a", amount: 300 },
      { memberId: "b", amount: 300 },
      { memberId: "c", amount: -300 },
      { memberId: "d", amount: -300 },
    ];
    expect(settle([...balances].reverse())).toEqual(settle(balances));
  });

  it("never exceeds N − 1 transactions on random groups", () => {
    let seed = 42;
    const random = () => {
      seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
      return seed / 2_147_483_648;
    };

    for (let round = 0; round < 500; round++) {
      const n = 2 + Math.floor(random() * 12);
      const balances: Balance[] = [];
      let running = 0;
      for (let i = 0; i < n - 1; i++) {
        const amount = Math.floor((random() - 0.5) * 2_000_000);
        balances.push({ memberId: `m${i}`, amount });
        running += amount;
      }
      balances.push({ memberId: `m${n - 1}`, amount: -running });

      const txs = settle(balances);
      const nonZero = balances.filter((b) => b.amount !== 0).length;
      expect(txs.length).toBeLessThanOrEqual(Math.max(0, nonZero - 1));
      expectFullySettled(balances, txs);
    }
  });
});
