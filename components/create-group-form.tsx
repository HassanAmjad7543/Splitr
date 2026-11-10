"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createGroup } from "@/lib/actions/groups";

export function CreateGroupForm() {
  const [name, setName] = useState("");
  const [members, setMembers] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const memberCount = members.split("\n").filter((line) => line.trim()).length;

  return (
    <form
      className="grid gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          // On success the action redirects to the new group page.
          const result = await createGroup({ name, members });
          if (!result.ok) setError(result.error);
        });
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="group-name">Group name</Label>
        <Input
          id="group-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Hunza trip, Flat 4B, Friday dinners…"
          maxLength={80}
          required
          autoFocus
        />
      </div>

      <div className="grid gap-2">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="group-members">Members</Label>
          <span className="text-xs text-muted-foreground">
            {memberCount} {memberCount === 1 ? "person" : "people"}
          </span>
        </div>
        <Textarea
          id="group-members"
          value={members}
          onChange={(e) => setMembers(e.target.value)}
          placeholder={"You\nAli\nSara\nHamza"}
          rows={6}
          required
        />
        <p className="text-xs text-muted-foreground">
          One name per line, and include yourself. Nobody needs an account; each person gets their own read-only
          link.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="sm:justify-self-start">
        {pending && <Loader2 className="animate-spin" />}
        Create group
      </Button>
    </form>
  );
}
