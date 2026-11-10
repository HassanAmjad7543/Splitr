"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * A card that can be collapsed on phones (to keep the expense list close to
 * the top) but is always open on desktop, where it sits in the sidebar.
 */
export function CollapsibleCard({
  title,
  summary,
  defaultOpen = true,
  children,
}: {
  title: string;
  summary?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-xl border bg-card shadow-xs">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3.5 text-left lg:pointer-events-none"
      >
        <h2 className="flex-1 font-semibold">{title}</h2>
        {summary && <span className={cn("text-sm lg:hidden", open && "hidden")}>{summary}</span>}
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform lg:hidden", open && "rotate-180")} />
      </button>
      <div className={cn("px-2 pb-3 sm:px-3", open ? "block" : "hidden", "lg:block")}>{children}</div>
    </section>
  );
}
