import { describe, expect, it } from "vitest";

import {
  formatBasisPoints,
  parsePercentToBasisPoints,
  splitByPercentage,
  splitEqual,
  splitExact,
  SplitError,
} from "@/lib/splits";

const sum = (shares: { amount: number }[]) => shares.reduce((acc, s) => acc + s.amount, 0);
const ids = (k: number) => Array.from({ length: k }, (_, i) => `m${i}`);

describe("splitEqual", () => {
  it("splits 100 paisa three ways as 33 / 33 / 34 with the payer taking the extra", () => {
    const shares = splitEqual(100, ["a", "b", "c"], "b");
    expect(shares).toEqual([
      { memberId: "a", amount: 33 },
      { memberId: "b", amount: 34 },
      { memberId: "c", amount: 33 },
    ]);
  });

  it("hands out leftovers one paisa at a time when the payer isn't in the split", () => {
    const shares = splitEqual(102, ["a", "b", "c", "d"], "someone-else");
    expect(shares.map((s) => s.amount)).toEqual([26, 26, 25, 25]);
  });

  it("always sums to the total, for any amount N and any member count K", () => {
    for (let k = 1; k <= 15; k++) {
      for (const n of [1, 2, 3, 7, 99, 100, 101, 1_000, 99_999, 123_457, 1_000_000_001]) {
        const members = ids(k);
        expect(sum(splitEqual(n, members, "m0"))).toBe(n);
        expect(sum(splitEqual(n, members, "not-in-split"))).toBe(n);
      }
    }
  });

  it("never lets two shares differ by more than the remainder", () => {
    const shares = splitEqual(1_000, ids(7), "nobody");
    const amounts = shares.map((s) => s.amount);
    expect(Math.max(...amounts) - Math.min(...amounts)).toBeLessThanOrEqual(1);
  });

  it("rejects empty or duplicated participants and non-positive totals", () => {
    expect(() => splitEqual(100, [], "a")).toThrow(SplitError);
    expect(() => splitEqual(100, ["a", "a"], "a")).toThrow(SplitError);
    expect(() => splitEqual(0, ["a"], "a")).toThrow(SplitError);
    expect(() => splitEqual(10.5, ["a"], "a")).toThrow(SplitError);
  });
});

describe("splitExact", () => {
  it("accepts amounts that add up and drops zero rows", () => {
    expect(
      splitExact(1_000, [
        { memberId: "a", amount: 700 },
        { memberId: "b", amount: 300 },
        { memberId: "c", amount: 0 },
      ]),
    ).toEqual([
      { memberId: "a", amount: 700 },
      { memberId: "b", amount: 300 },
    ]);
  });

  it("rejects amounts that are short or over", () => {
    expect(() => splitExact(1_000, [{ memberId: "a", amount: 999 }])).toThrow(/short/);
    expect(() => splitExact(1_000, [{ memberId: "a", amount: 1_001 }])).toThrow(/over/);
  });
});

describe("splitByPercentage", () => {
  it("splits by percentage and gives rounding leftovers to the payer", () => {
    const shares = splitByPercentage(
      100,
      [
        { memberId: "a", basisPoints: 3_333 },
        { memberId: "b", basisPoints: 3_333 },
        { memberId: "c", basisPoints: 3_334 },
      ],
      "a",
    );
    expect(shares.map((s) => s.amount)).toEqual([34, 33, 33]);
    expect(sum(shares)).toBe(100);
  });

  it("uses largest remainder when the payer isn't in the split", () => {
    const shares = splitByPercentage(
      101,
      [
        { memberId: "a", basisPoints: 5_000 },
        { memberId: "b", basisPoints: 2_500 },
        { memberId: "c", basisPoints: 2_500 },
      ],
      "x",
    );
    // exact shares: 50.5, 25.25, 25.25 -> floors 50, 25, 25; the one leftover paisa goes to a (0.5 > 0.25)
    expect(shares.map((s) => s.amount)).toEqual([51, 25, 25]);
  });

  it("always sums to the total for random percentages", () => {
    let seed = 7;
    const random = () => {
      seed = (seed * 16_807) % 2_147_483_647;
      return seed / 2_147_483_647;
    };
    for (let round = 0; round < 1_000; round++) {
      const k = 1 + Math.floor(random() * 10);
      // random basis points that add up to exactly 10000
      const cuts = Array.from({ length: k - 1 }, () => Math.floor(random() * 10_001)).sort((a, b) => a - b);
      const bps = [...cuts, 10_000].map((c, i) => c - (i === 0 ? 0 : cuts[i - 1]));
      const entries = bps.map((basisPoints, i) => ({ memberId: `m${i}`, basisPoints }));
      const total = 1 + Math.floor(random() * 10_000_000);
      const payer = random() < 0.5 ? "m0" : "outsider";
      if (entries.every((e) => e.basisPoints === 0)) continue;
      expect(sum(splitByPercentage(total, entries, payer))).toBe(total);
    }
  });

  it("rejects percentages that don't add up to 100", () => {
    expect(() =>
      splitByPercentage(
        100,
        [
          { memberId: "a", basisPoints: 5_000 },
          { memberId: "b", basisPoints: 4_000 },
        ],
        "a",
      ),
    ).toThrow(/90%/);
  });
});

describe("percent parsing", () => {
  it("parses up to two decimals without floats", () => {
    expect(parsePercentToBasisPoints("33.33")).toBe(3_333);
    expect(parsePercentToBasisPoints("50%")).toBe(5_000);
    expect(parsePercentToBasisPoints("0.1")).toBe(10);
    expect(parsePercentToBasisPoints("")).toBe(0);
    expect(() => parsePercentToBasisPoints("100.01")).toThrow();
    expect(() => parsePercentToBasisPoints("1.234")).toThrow();
    expect(() => parsePercentToBasisPoints("abc")).toThrow();
  });

  it("formats basis points back", () => {
    expect(formatBasisPoints(3_350)).toBe("33.5");
    expect(formatBasisPoints(3_333)).toBe("33.33");
    expect(formatBasisPoints(10_000)).toBe("100");
    expect(formatBasisPoints(5)).toBe("0.05");
  });
});
