import { formatPKR } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Every rupee value in the UI goes through this: Geist Mono with tabular
 * digits so decimals line up, and consistent colour semantics.
 *
 * tone="balance": green when positive (is owed), red when negative (owes),
 * muted at zero. The sign is conveyed by colour + surrounding words, so the
 * number itself is shown as an absolute value unless `signed` is set.
 */
export function Money({
  paisa,
  tone = "plain",
  signed = false,
  className,
}: {
  paisa: number;
  tone?: "plain" | "balance" | "muted";
  signed?: boolean;
  className?: string;
}) {
  const text = signed
    ? `${paisa > 0 ? "+" : paisa < 0 ? "−" : ""}${formatPKR(Math.abs(paisa))}`
    : formatPKR(Math.abs(paisa));

  return (
    <span
      className={cn(
        "font-mono tabular whitespace-nowrap",
        tone === "balance" && paisa > 0 && "text-positive",
        tone === "balance" && paisa < 0 && "text-negative",
        (tone === "muted" || (tone === "balance" && paisa === 0)) && "text-muted-foreground",
        className,
      )}
    >
      {text}
    </span>
  );
}
