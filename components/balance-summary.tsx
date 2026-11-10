import { Money } from "@/components/money";
import type { Balance } from "@/lib/balances";
import type { Member } from "@/types";

export function BalanceSummary({ members, balances }: { members: Member[]; balances: Balance[] }) {
  const balanceOf = new Map(balances.map((b) => [b.memberId, b.amount]));

  return (
    <ul className="grid gap-1">
      {members.map((m) => {
        const amount = balanceOf.get(m.id) ?? 0;
        return (
          <li key={m.id} className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50">
            <span className="min-w-0 truncate font-mono text-sm">{m.name}</span>
            <span className="flex items-baseline gap-2 text-sm">
              <span className="text-xs text-muted-foreground">
                {amount > 0 ? "gets back" : amount < 0 ? "owes" : "settled"}
              </span>
              <Money paisa={amount} tone="balance" className="font-medium" />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
