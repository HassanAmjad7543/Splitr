import { ChevronRight, Receipt, Users } from "lucide-react";
import Link from "next/link";

import { Money } from "@/components/money";
import type { GroupSummary } from "@/lib/data";

export function GroupCard({ group }: { group: GroupSummary }) {
  return (
    <Link
      href={`/groups/${group.id}`}
      className="group flex items-center gap-4 rounded-xl border bg-card p-4 shadow-xs transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-lg font-semibold text-primary">
        {group.name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="truncate font-medium">{group.name}</h2>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5" />
            {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Receipt className="size-3.5" />
            {group.expenseCount} {group.expenseCount === 1 ? "expense" : "expenses"}
          </span>
        </div>
      </div>
      <div className="hidden text-right sm:block">
        <div className="text-xs text-muted-foreground">Total spent</div>
        <Money paisa={group.totalSpent} className="text-sm" />
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
