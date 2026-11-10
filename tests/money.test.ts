import { describe, expect, it } from "vitest";

import { formatPKR, paisaToInputString, parseRupeesToPaisa } from "@/lib/money";

describe("parseRupeesToPaisa", () => {
  it("parses whole and decimal rupee amounts exactly", () => {
    expect(parseRupeesToPaisa("1500")).toBe(150_000);
    expect(parseRupeesToPaisa("1234.56")).toBe(123_456);
    expect(parseRupeesToPaisa("0.29")).toBe(29); // parseFloat("0.29") * 100 = 28.999999999999996
    expect(parseRupeesToPaisa("1.1")).toBe(110);
    expect(parseRupeesToPaisa(".5")).toBe(50);
    expect(parseRupeesToPaisa("12.")).toBe(1_200);
  });

  it("ignores commas, spaces and a Rs prefix", () => {
    expect(parseRupeesToPaisa("Rs 1,234.50")).toBe(123_450);
    expect(parseRupeesToPaisa("rs.500")).toBe(50_000);
    expect(parseRupeesToPaisa(" 2 000 ")).toBe(200_000);
  });

  it("rejects junk, negatives, zero, too many decimals and huge amounts", () => {
    for (const bad of ["", ".", "abc", "-5", "0", "0.00", "1.234", "1e5", "10000001"]) {
      expect(() => parseRupeesToPaisa(bad), bad).toThrow();
    }
  });
});

describe("formatPKR", () => {
  it("formats paisa as rupees with two decimals", () => {
    expect(formatPKR(123_456)).toBe("Rs 1,234.56");
    expect(formatPKR(40_000)).toBe("Rs 400.00");
    expect(formatPKR(5)).toBe("Rs 0.05");
    expect(formatPKR(0)).toBe("Rs 0.00");
    expect(formatPKR(-10_050)).toBe("-Rs 100.50");
    expect(formatPKR(123_456_789_00)).toBe("Rs 123,456,789.00");
  });

  it("refuses non-integer input", () => {
    expect(() => formatPKR(1.5)).toThrow();
  });
});

describe("paisaToInputString", () => {
  it("round-trips through the parser", () => {
    for (const paisa of [1, 50, 100, 12_345, 150_000, 999_999_999]) {
      expect(parseRupeesToPaisa(paisaToInputString(paisa))).toBe(paisa);
    }
  });
});
