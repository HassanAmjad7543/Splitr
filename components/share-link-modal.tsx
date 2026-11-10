"use client";

import { Check, Copy, MessageCircle, RefreshCw, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { regenerateShareToken } from "@/lib/actions/groups";
import type { Member } from "@/types";

export function ShareLinkModal({ groupId, groupName, members }: { groupId: string; groupName: string; members: Member[] }) {
  const [origin, setOrigin] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resetting, setResetting] = useState<Member | null>(null);

  useEffect(() => setOrigin(window.location.origin), []);

  const linkFor = (m: Member) => `${origin}/share/${m.shareToken}`;

  async function copy(m: Member) {
    try {
      await navigator.clipboard.writeText(linkFor(m));
      setCopiedId(m.id);
      toast.success(`Link for ${m.name} copied`);
      setTimeout(() => setCopiedId((id) => (id === m.id ? null : id)), 2000);
    } catch {
      toast.error("Couldn't copy. Long-press the link to copy it instead.");
    }
  }

  function whatsappHref(m: Member) {
    const text = `Hi ${m.name}, here's your balance for "${groupName}": ${linkFor(m)}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="shrink-0">
          <Share2 />
          <span className="hidden sm:inline">Share</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Share links</DialogTitle>
          <DialogDescription>
            Each person gets a private, read-only link showing only their own balance and the expenses they&apos;re
            part of. No account needed. Treat links like passwords.
          </DialogDescription>
        </DialogHeader>

        <ul className="grid gap-2">
          {members.map((m) => (
            <li key={m.id} className="rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate font-mono text-sm font-medium">{m.name}</span>
                <Button variant="ghost" size="icon-sm" asChild aria-label={`Send ${m.name}'s link on WhatsApp`}>
                  <a href={whatsappHref(m)} target="_blank" rel="noopener noreferrer">
                    <MessageCircle />
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Reset ${m.name}'s link`}
                  onClick={() => setResetting(m)}
                >
                  <RefreshCw />
                </Button>
                <Button variant="secondary" size="sm" onClick={() => copy(m)} disabled={!origin}>
                  {copiedId === m.id ? <Check /> : <Copy />}
                  {copiedId === m.id ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="mt-1.5 truncate font-mono text-xs text-muted-foreground select-all">
                {origin ? linkFor(m) : "…"}
              </p>
            </li>
          ))}
        </ul>

        <ConfirmDialog
          open={resetting !== null}
          onOpenChange={(open) => !open && setResetting(null)}
          title={`Reset ${resetting?.name ?? ""}'s link?`}
          description="Their current link stops working immediately. You'll need to send them the new one."
          confirmLabel="Reset link"
          onConfirm={async () => {
            if (!resetting) return;
            const result = await regenerateShareToken(groupId, resetting.id);
            if (!result.ok) return result.error;
            toast.success(`New link created for ${resetting.name}`);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
