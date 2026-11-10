import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function GroupNotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">Group not found</h1>
      <p className="mt-2 text-muted-foreground">It may have been deleted, or it belongs to another account.</p>
      <Button asChild className="mt-6">
        <Link href="/groups">Back to your groups</Link>
      </Button>
    </main>
  );
}
