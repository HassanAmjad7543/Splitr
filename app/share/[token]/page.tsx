import { ArrowDownLeft, ArrowUpRight, PartyPopper } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { LogoMark } from "@/components/logo";
import { Money } from "@/components/money";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { getShareView } from "@/lib/share";
import { site } from "@/lib/site";
import { cn, formatDate, joinNames } from "@/lib/utils";

type Props = { params: Promise<{ token: string }> };

// Dedupe the lookup between generateMetadata and the page within one request.
const loadView = cache(getShareView);

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const view = await loadView(token);
  return {
    title: view ? `${view.member.name} · ${view.groupName}` : "Link not found",
    // Share links are private; keep them out of search engines and link previews' referrers.
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

export default async function SharePage({ params }: Props) {
  const { token } = await params;
  const view = await loadView(token);
  if (!view) notFound();

  const { member, expenses, settlements } = view;
  const firstName = member.name.split(" ")[0];

  return (
    <div className="min-h-dvh">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <div className="flex min-w-0 items-center gap-2">
            <LogoMark className="size-6 shrink-0" />
            <span className="truncate font-medium">{view.groupName}</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto grid max-w-2xl gap-8 px-4 py-8">
        {/* Headline balance */}
        <section className="text-center">
          <p className="text-muted-foreground">Hi {firstName},</p>
          {member.balance === 0 ? (
            <div className="mt-3 flex flex-col items-center gap-2">
              <PartyPopper className="size-9 text-positive" />
              <p className="text-2xl font-semibold text-positive">You&apos;re all square</p>
            </div>
          ) : (
            <>
              <p className="mt-1 text-lg">{member.balance < 0 ? "you owe" : "you get back"}</p>
              <Money paisa={member.balance} tone="balance" className="mt-1 block text-4xl font-semibold sm:text-5xl" />
            </>
          )}
          <p className="mt-4 text-sm text-muted-foreground">
            You paid <Money paisa={member.totalPaid} /> · your share <Money paisa={member.totalShare} />
          </p>
        </section>

        {/* This member's rows of the settlement plan */}
        {settlements.length > 0 && (
          <section>
            <h2 className="mb-3 font-semibold">How to settle</h2>
            <ul className="grid gap-2">
              {settlements.map((s, i) => (
                <li key={i} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full",
                      s.direction === "pay" ? "bg-negative/12 text-negative" : "bg-positive/12 text-positive",
                    )}
                  >
                    {s.direction === "pay" ? <ArrowUpRight className="size-4" /> : <ArrowDownLeft className="size-4" />}
                  </span>
                  <span className="flex-1">
                    {s.direction === "pay" ? "Pay " : "Collect from "}
                    <span className="font-mono font-medium">{s.otherName}</span>
                  </span>
                  <Money paisa={s.amount} className="font-medium" />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Only expenses this member paid for or is part of */}
        <section>
          <h2 className="mb-3 font-semibold">Your expenses</h2>
          {expenses.length === 0 ? (
            <p className="rounded-xl border border-dashed px-4 py-8 text-center text-muted-foreground">
              Nothing yet. Expenses you&apos;re part of will show up here.
            </p>
          ) : (
            <ul className="divide-y rounded-xl border bg-card">
              {expenses.map((e, i) => (
                <li key={i} className="grid gap-1 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{e.note || "Expense"}</p>
                    <Money paisa={e.amount} className="text-sm text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(e.date)} · {e.paidByMe ? "You" : e.paidByName} paid · split with{" "}
                    {joinNames(e.splitWith.map((n) => (n === member.name ? "you" : n)))}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {e.myShare > 0 && (
                      <Badge variant="outline" className="font-normal">
                        Your share&nbsp;<Money paisa={e.myShare} />
                      </Badge>
                    )}
                    {e.paidByMe && (
                      <Badge variant="positive" className="font-normal">
                        You paid
                      </Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="pb-4 text-center text-xs text-muted-foreground">
          Something look wrong? Message whoever sent you this link.
          <br />
          Read-only view · {site.name}
        </footer>
      </main>
    </div>
  );
}
