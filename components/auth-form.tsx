"use client";

import { Loader2, MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

/** Only allow same-site relative redirects after login. */
function safeNext(next: string | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/groups";
}

export function AuthForm({ mode, next, initialError }: { mode: Mode; next?: string; initialError?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [pending, setPending] = useState<"email" | "google" | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  const destination = safeNext(next);
  const callbackUrl = () =>
    `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(destination)}`;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending("email");
    const supabase = createClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setPending(null);
        return;
      }
      router.replace(destination);
      router.refresh();
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: callbackUrl() },
    });
    if (error) {
      setError(error.message);
      setPending(null);
      return;
    }
    if (data.session) {
      // Email confirmation is off for this project: we're already logged in.
      router.replace(destination);
      router.refresh();
      return;
    }
    setCheckEmail(true);
    setPending(null);
  }

  async function onGoogle() {
    setError(null);
    setPending("google");
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    if (error) {
      setError(error.message);
      setPending(null);
    }
  }

  if (checkEmail) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader className="justify-items-center text-center">
          <MailCheck className="mb-2 size-10 text-primary" />
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We sent a confirmation link to <span className="font-medium text-foreground">{email}</span>. Open it on
            this device to finish signing up.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const isLogin = mode === "login";

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">{isLogin ? "Welcome back" : "Create your account"}</CardTitle>
        <CardDescription>
          {isLogin
            ? "Log in to manage your groups."
            : "Only the organizer needs an account. Everyone else just gets a link."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <Button type="button" variant="outline" className="w-full" onClick={onGoogle} disabled={pending !== null}>
          {pending === "google" ? <Loader2 className="animate-spin" /> : <GoogleIcon />}
          Continue with Google
        </Button>

        <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              required
              minLength={isLogin ? undefined : 8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {!isLogin && <p className="text-xs text-muted-foreground">At least 8 characters.</p>}
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={pending !== null}>
            {pending === "email" && <Loader2 className="animate-spin" />}
            {isLogin ? "Log in" : "Sign up"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isLogin ? "New here? " : "Already have an account? "}
          <Link
            href={`${isLogin ? "/signup" : "/login"}${next ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {isLogin ? "Create an account" : "Log in"}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
