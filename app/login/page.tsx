import type { Metadata } from "next";
import Link from "next/link";

import { AuthForm } from "@/components/auth-form";
import { Logo } from "@/components/logo";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-12">
      <Logo />
      <AuthForm mode="login" next={next} initialError={error} />
      <LegalLinks />
    </main>
  );
}

function LegalLinks() {
  return (
    <p className="text-center text-xs text-muted-foreground">
      By continuing you agree to the{" "}
      <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">
        Terms
      </Link>{" "}
      and{" "}
      <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
        Privacy Policy
      </Link>
      .
    </p>
  );
}
