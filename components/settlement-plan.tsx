import { ArrowRight, PartyPopper } from "lucide-react";

import { Money } from "@/components/money";
import type { Transaction } from "@/lib/settle";
import type { Member } from "@/types";

export function SettlementPlan({
  members,
  settlements,
  hasExpenses,
}: {
  members: Member[];
  settlements: Transaction[];
  hasExpenses: boolean;
}) {
  const nameOf = new Map(members.map((m) => [m.id, m.name]));

  if (settlements.length === 0) {
    return hasExpenses ? (
      <div className="flex flex-col items-center gap-2 rounded-lg bg-positive/10 px-4 py-6 text-center">
        <PartyPopper className="size-8 text-positive" />
        <p className="font-semibold text-positive">All square!</p>
        <p className="text-sm text-muted-foreground">Nobody owes anybody anything.</p>
      </div>
    ) : (
      <p className="px-2 text-sm text-muted-foreground">Add an expense and the payback plan shows up here.</p>
    );
  }

  return (
    <ol className="grid gap-1.5">
      {settlements.map((tx, i) => (
        <li key={`${tx.from}-${tx.to}`} className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm">
          <span className="font-mono text-xs text-muted-foreground">{i + 1}.</span>
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 font-mono">
            <span className="truncate text-negative">{nameOf.get(tx.from)}</span>
            <span className="inline-flex items-center gap-1 font-sans text-muted-foreground">
              pays <ArrowRight className="size-3" />
            </span>
            <span className="truncate text-positive">{nameOf.get(tx.to)}</span>
          </span>
          <Money paisa={tx.amount} className="font-medium" />
        </li>
      ))}
    </ol>
  );
}
