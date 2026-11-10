import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { CreateGroupForm } from "@/components/create-group-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "New group" };

export default function NewGroupPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <Button variant="ghost" size="sm" asChild className="-ml-3 mb-4 text-muted-foreground">
        <Link href="/groups">
          <ArrowLeft />
          All groups
        </Link>
      </Button>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">New group</h1>
      <CreateGroupForm />
    </main>
  );
}
