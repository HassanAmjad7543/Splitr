"use client";

import { ArrowLeft, Loader2, MoreVertical, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { ShareLinkModal } from "@/components/share-link-modal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteGroup, renameGroup } from "@/lib/actions/groups";
import type { Member } from "@/types";

export function GroupHeader({ groupId, name, members }: { groupId: string; name: string; members: Member[] }) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4">
        <Button variant="ghost" size="icon" asChild className="-ml-2 shrink-0">
          <Link href="/groups" aria-label="All groups">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold sm:text-xl">{name}</h1>
        <ShareLinkModal groupId={groupId} groupName={name} members={members} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Group options" className="shrink-0">
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
              <Pencil />
              Rename group
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
              <Trash2 />
              Delete group
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <RenameGroupDialog groupId={groupId} name={name} open={renameOpen} onOpenChange={setRenameOpen} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete "${name}"?`}
        description="This permanently deletes the group, its members, every expense and every share link. It can't be undone."
        confirmLabel="Delete group"
        onConfirm={async () => {
          const result = await deleteGroup(groupId);
          if (!result.ok) return result.error;
        }}
      />
    </div>
  );
}

function RenameGroupDialog({
  groupId,
  name,
  open,
  onOpenChange,
}: {
  groupId: string;
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setValue(name);
          setError(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename group</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const result = await renameGroup(groupId, value);
              if (!result.ok) return setError(result.error);
              toast.success("Group renamed");
              onOpenChange(false);
            });
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="rename-group">Name</Label>
            <Input id="rename-group" value={value} onChange={(e) => setValue(e.target.value)} maxLength={80} autoFocus />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
