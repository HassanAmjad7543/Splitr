"use client";

import { Loader2, MoreHorizontal, Pencil, Trash2, UserPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addMember, deleteMember, renameMember } from "@/lib/actions/groups";
import type { Member } from "@/types";

export function MemberList({ groupId, members }: { groupId: string; members: Member[] }) {
  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, startAdding] = useTransition();
  const [renaming, setRenaming] = useState<Member | null>(null);
  const [removing, setRemoving] = useState<Member | null>(null);

  return (
    <div className="grid gap-3">
      <ul className="grid gap-0.5">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-2 rounded-md py-0.5 pl-2 hover:bg-muted/50">
            <span className="min-w-0 flex-1 truncate font-mono text-sm">{m.name}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={`Options for ${m.name}`}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setRenaming(m)}>
                  <Pencil />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setRemoving(m)}>
                  <Trash2 />
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        ))}
      </ul>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setAddError(null);
          startAdding(async () => {
            const result = await addMember(groupId, newName);
            if (!result.ok) return setAddError(result.error);
            toast.success(`${newName.trim()} added`);
            setNewName("");
          });
        }}
      >
        <Input
          aria-label="New member name"
          placeholder="Add someone"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          maxLength={60}
          className="h-9"
        />
        <Button type="submit" variant="secondary" size="sm" className="h-9" disabled={adding || !newName.trim()}>
          {adding ? <Loader2 className="animate-spin" /> : <UserPlus />}
          Add
        </Button>
      </form>
      {addError && <p className="text-sm text-destructive">{addError}</p>}

      {members.length < 2 && (
        <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          Add at least one more person to start splitting expenses.
        </p>
      )}

      <RenameMemberDialog groupId={groupId} member={renaming} onClose={() => setRenaming(null)} />
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Remove ${removing?.name ?? ""}?`}
        description="Their share link stops working. People who are part of existing expenses can't be removed until those expenses are edited or deleted."
        confirmLabel="Remove"
        onConfirm={async () => {
          if (!removing) return;
          const result = await deleteMember(groupId, removing.id);
          if (!result.ok) return result.error;
          toast.success(`${removing.name} removed`);
        }}
      />
    </div>
  );
}

function RenameMemberDialog({ groupId, member, onClose }: { groupId: string; member: Member | null; onClose: () => void }) {
  return (
    <Dialog open={member !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename member</DialogTitle>
        </DialogHeader>
        {member && <RenameMemberForm key={member.id} groupId={groupId} member={member} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function RenameMemberForm({ groupId, member, onClose }: { groupId: string; member: Member; onClose: () => void }) {
  const [value, setValue] = useState(member.name);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await renameMember(groupId, member.id, value);
          if (!result.ok) return setError(result.error);
          toast.success("Member renamed");
          onClose();
        });
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="rename-member">Name</Label>
        <Input id="rename-member" value={value} onChange={(e) => setValue(e.target.value)} maxLength={60} autoFocus />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}
