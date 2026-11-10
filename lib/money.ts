/**
 * Money helpers.
 *
 * Every amount in this app is an integer number of paisa (1/100 of a rupee).
 * JavaScript floats can't represent most decimal fractions exactly
 * (0.1 + 0.2 === 0.30000000000000004), and over hundreds of three-way splits
 * those tiny errors add up until balances no longer sum to zero.
 *
 * So: integers everywhere, and conversion only happens at the two boundaries —
 * parsing what the user typed, and formatting what we display.
 */

/** Largest single expense we accept: Rs 10,000,000 (one crore). */
export const MAX_AMOUNT_PAISA = 1_000_000_000;

const groupFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/**
 * Display: 123456 paisa -> "Rs 1,234.56".
 *
 * Built from integer parts rather than `paisa / 100` so formatting can never
 * introduce a rounding artefact either.
 */
export function formatPKR(paisa: number): string {
  if (!Number.isSafeInteger(paisa)) {
    throw new Error(`formatPKR expects an integer number of paisa, got ${paisa}`);
  }
  const sign = paisa < 0 ? "-" : "";
  const abs = Math.abs(paisa);
  const rupees = Math.floor(abs / 100);
  const cents = String(abs % 100).padStart(2, "0");
  return `${sign}Rs ${groupFormatter.format(rupees)}.${cents}`;
}

/** Plain decimal string for pre-filling inputs: 123456 -> "1234.56", 50000 -> "500". */
export function paisaToInputString(paisa: number): string {
  const rupees = Math.floor(paisa / 100);
  const cents = paisa % 100;
  return cents === 0 ? String(rupees) : `${rupees}.${String(cents).padStart(2, "0")}`;
}

/**
 * Input: "1,234.56" -> 123456 paisa.
 *
 * Parsed as a string (whole part + up to two decimal digits) instead of via
 * parseFloat, so "0.29" becomes exactly 29 and never 28.999999999999996.
 * Throws on anything that isn't a positive amount with at most two decimals.
 */
export function parseRupeesToPaisa(input: string): number {
  const cleaned = input.trim().replace(/^rs\.?\s*/i, "").replace(/[,\s]/g, "");
  const match = /^(\d*)(?:\.(\d{0,2}))?$/.exec(cleaned);
  if (!match || (match[1] === "" && !match[2])) {
    throw new Error("Enter an amount like 1500 or 1500.50");
  }
  const whole = Number(match[1] || "0");
  const fraction = Number((match[2] ?? "").padEnd(2, "0"));
  const paisa = whole * 100 + fraction;
  if (!Number.isSafeInteger(paisa) || paisa > MAX_AMOUNT_PAISA) {
    throw new Error("That amount is too large");
  }
  if (paisa <= 0) {
    throw new Error("Amount must be greater than zero");
  }
  return paisa;
}

/** Same as parseRupeesToPaisa but returns null instead of throwing. Handy for live previews. */
export function tryParseRupeesToPaisa(input: string): number | null {
  try {
    return parseRupeesToPaisa(input);
  } catch {
    return null;
  }
}
