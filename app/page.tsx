import { ArrowRight, Link2, ListChecks, UserRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Money } from "@/components/money";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { site } from "@/lib/site";
import { getUser } from "@/lib/supabase/server";

export default async function HomePage() {
  const user = await getUser();
  if (user) redirect("/groups");

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:py-24 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="mb-4 font-mono text-sm text-primary">{site.tagline.toLowerCase()}</p>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Split the bill without making everyone sign up.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-pretty text-muted-foreground">
              One person logs the expenses. Everyone else gets a private link to see what they owe. No app installs
              and no chasing people to make accounts.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/signup">
                  Start a group <ArrowRight />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Log in</Link>
              </Button>
            </div>
          </div>

          <ExampleCard />
        </section>

        <section className="border-t bg-muted/30">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:grid-cols-3">
            <Feature icon={<UserRound />} title="One account, not five">
              Only the organizer signs up. Members are just names.
            </Feature>
            <Feature icon={<ListChecks />} title="Fewest transfers">
              Balances are netted, so three friends settle up in two payments instead of six.
            </Feature>
            <Feature icon={<Link2 />} title="A link per person">
              Each member sees their own balance and their own expenses. Nothing else.
            </Feature>
          </div>
        </section>
      </main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        {site.name} · {site.tagline}
      </footer>
    </div>
  );
}

function Feature({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/12 text-primary [&_svg]:size-5">
        {icon}
      </div>
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

/** A static preview of the settlement plan, from the classic three-friends example. */
function ExampleCard() {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <span className="font-semibold">Islamabad weekend</span>
        <span className="text-xs text-muted-foreground">3 expenses</span>
      </div>
      <ul className="grid gap-2 text-sm">
        {[
          ["Dinner", "Alice", 150_000],
          ["Petrol", "Bob", 90_000],
          ["Parking", "Charlie", 60_000],
        ].map(([what, who, amount]) => (
          <li key={what} className="flex justify-between rounded-lg bg-muted/50 px-3 py-2">
            <span>
              {what} <span className="text-muted-foreground">· {who} paid</span>
            </span>
            <Money paisa={amount as number} />
          </li>
        ))}
      </ul>
      <div className="mt-5 mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Settle up in 2 payments
      </div>
      <ol className="grid gap-1.5 font-mono text-sm">
        <li className="flex justify-between rounded-lg border px-3 py-2">
          <span>
            <span className="text-negative">Charlie</span> → <span className="text-positive">Alice</span>
          </span>
          <Money paisa={40_000} />
        </li>
        <li className="flex justify-between rounded-lg border px-3 py-2">
          <span>
            <span className="text-negative">Bob</span> → <span className="text-positive">Alice</span>
          </span>
          <Money paisa={10_000} />
        </li>
      </ol>
    </div>
  );
}
