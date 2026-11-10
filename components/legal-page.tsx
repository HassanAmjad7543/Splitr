import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { site } from "@/lib/site";

/** Shared layout for the Privacy and Terms pages. */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p>
        <div className="mt-8 grid gap-6 leading-relaxed text-pretty [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ul]:grid [&_ul]:gap-1.5 [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline">
          {children}
        </div>
      </main>
      <LegalFooter />
    </div>
  );
}

export function LegalFooter() {
  return (
    <footer className="border-t py-6 text-center text-sm text-muted-foreground">
      <span>
        {site.name} · {site.tagline}
      </span>
      <span className="mx-2">·</span>
      <Link href="/privacy" className="hover:text-foreground">
        Privacy
      </Link>
      <span className="mx-2">·</span>
      <Link href="/terms" className="hover:text-foreground">
        Terms
      </Link>
    </footer>
  );
}
