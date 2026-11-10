"use client";

import { Button } from "@/components/ui/button";

export default function GroupsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-muted-foreground">We couldn&apos;t load this page. Check your connection and try again.</p>
      <Button onClick={reset} className="mt-6">
        Try again
      </Button>
    </main>
  );
}
