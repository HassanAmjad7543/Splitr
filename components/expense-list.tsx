"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { ExpenseDialog } from "@/components/expense-dialog";
import { Money } from "@/components/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteExpense } from "@/lib/actions/expenses";
import { formatPKR } from "@/lib/money";
import { formatDate, joinNames } from "@/lib/utils";
import type { Expense, Member } from "@/types";

const SPLIT_LABEL = { equal: "Equal", exact: "Exact", percentage: "%" } as const;

export function ExpenseList({ groupId, members, expenses }: { groupId: string; members: Member[]; expenses: Expense[] }) {
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const nameOf = new Map(members.map((m) => [m.id, m.name]));

  // Group rows under a date heading.
  const byDate = new Map<string, Expense[]>();
  for (const e of expenses) byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);

  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
        {[...byDate.entries()].map(([date, rows]) => (
          <section key={date}>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {formatDate(date)}
            </h3>
            <ul className="divide-y rounded-xl border bg-card">
              {rows.map((e) => {
                const participants = e.splits.map((s) => nameOf.get(s.memberId) ?? "?");
                const everyone = e.splits.length === members.length;
                return (
                  <li key={e.id} className="flex items-start gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">{e.note || "Expense"}</p>
                        <Badge variant="secondary" className="font-normal">
                          {SPLIT_LABEL[e.splitType]}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        <span className="text-foreground">{nameOf.get(e.paidBy) ?? "Someone"}</span> paid
                        {" · "}
                        {everyone ? "split with everyone" : `split with ${joinNames(participants)}`}
                      </p>
                    </div>
                    <Money paisa={e.amount} className="shrink-0 pt-0.5 font-medium" />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="Expense options" className="-mt-1 -mr-2">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setEditing(e)}>
                          <Pencil />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(e)}>
                          <Trash2 />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <ExpenseDialog
        groupId={groupId}
        members={members}
        expense={editing ?? undefined}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this expense?"
        description={
          deleting
            ? `"${deleting.note || "Expense"}" for ${formatPKR(deleting.amount)} will be removed and balances recalculated.`
            : ""
        }
        onConfirm={async () => {
          if (!deleting) return;
          const result = await deleteExpense(groupId, deleting.id);
          if (!result.ok) return result.error;
          toast.success("Expense deleted");
        }}
      />
    </>
  );
}
