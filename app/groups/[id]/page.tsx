import { Receipt } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BalanceSummary } from "@/components/balance-summary";
import { CollapsibleCard } from "@/components/collapsible-card";
import { AddExpenseButton } from "@/components/expense-dialog";
import { ExpenseList } from "@/components/expense-list";
import { GroupHeader } from "@/components/group-header";
import { MemberList } from "@/components/member-list";
import { Money } from "@/components/money";
import { SettlementPlan } from "@/components/settlement-plan";
import { getGroupDetail } from "@/lib/data";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const group = await getGroupDetail(id);
  return { title: group?.name ?? "Group" };
}

export default async function GroupPage({ params }: Props) {
  const { id } = await params;
  const group = await getGroupDetail(id);
  if (!group) notFound();

  const { members, expenses, balances, settlements } = group;
  const totalSpent = expenses.reduce((acc, e) => acc + e.amount, 0);
  const canAddExpense = members.length >= 2;

  return (
    <>
      <GroupHeader groupId={group.id} name={group.name} members={members} />

      <main className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        {/* Sidebar: balances first on phones, pinned right on desktop. */}
        <aside className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 lg:sticky lg:top-20 lg:order-2">
          <CollapsibleCard
            title="Settle up"
            summary={
              settlements.length > 0
                ? `${settlements.length} ${settlements.length === 1 ? "payment" : "payments"}`
                : expenses.length > 0
                  ? "All square"
                  : undefined
            }
          >
            <SettlementPlan members={members} settlements={settlements} hasExpenses={expenses.length > 0} />
          </CollapsibleCard>
          <CollapsibleCard title="Balances" defaultOpen={false}>
            <BalanceSummary members={members} balances={balances} />
          </CollapsibleCard>
          <CollapsibleCard title={`Members (${members.length})`} defaultOpen={false}>
            <MemberList groupId={group.id} members={members} />
          </CollapsibleCard>
        </aside>

        <section className="min-w-0 lg:order-1">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Expenses</h2>
              {expenses.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {expenses.length} {expenses.length === 1 ? "expense" : "expenses"} · <Money paisa={totalSpent} />{" "}
                  total
                </p>
              )}
            </div>
            {expenses.length > 0 && <AddExpenseButton groupId={group.id} members={members} />}
          </div>

          {expenses.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed px-6 py-14 text-center">
              <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary/12 text-primary">
                <Receipt className="size-7" />
              </div>
              <h3 className="text-lg font-semibold">No expenses yet</h3>
              <p className="mt-1 max-w-sm text-muted-foreground">
                {canAddExpense
                  ? "Log the first bill: dinner, petrol, tickets. Balances and the payback plan update instantly."
                  : "This group only has one person. Add someone under Members to start splitting."}
              </p>
              <div className="mt-6">
                <AddExpenseButton groupId={group.id} members={members} size="lg" label="Add first expense" />
              </div>
            </div>
          ) : (
            <ExpenseList groupId={group.id} members={members} expenses={expenses} />
          )}
        </section>
      </main>
    </>
  );
}
