import Link from "next/link";

import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7", className)}>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      {/* two halves of a coin, split */}
      <path d="M15 8a8 8 0 0 0 0 16z" className="fill-primary-foreground" />
      <path d="M17 8a8 8 0 0 1 0 16z" className="fill-primary-foreground/55" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <LogoMark />
      <span className="text-lg">{site.name}</span>
    </Link>
  );
}
