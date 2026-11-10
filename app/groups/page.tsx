import { Plus, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { GroupCard } from "@/components/group-card";
import { Button } from "@/components/ui/button";
import { listGroups } from "@/lib/data";

export const metadata: Metadata = { title: "Your groups" };

export default async function GroupsPage() {
  const groups = await listGroups();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Your groups</h1>
        {groups.length > 0 && (
          <Button asChild>
            <Link href="/groups/new">
              <Plus />
              New group
            </Link>
          </Button>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed px-6 py-16 text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary/12 text-primary">
            <Users className="size-7" />
          </div>
          <h2 className="text-lg font-semibold">No groups yet</h2>
          <p className="mt-1 max-w-sm text-muted-foreground">
            Make one for your flat, your next trip, or Friday dinners. Add names and you&apos;re ready to log the
            first bill.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link href="/groups/new">
              <Plus />
              Create your first group
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      )}
    </main>
  );
}
