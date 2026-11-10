"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { ExpenseForm } from "@/components/expense-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Expense, Member } from "@/types";

/** Controlled dialog wrapping the expense form, used for both add and edit. */
export function ExpenseDialog({
  groupId,
  members,
  expense,
  open,
  onOpenChange,
}: {
  groupId: string;
  members: Member[];
  expense?: Expense;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{expense ? "Edit expense" : "Add expense"}</DialogTitle>
          <DialogDescription className="sr-only">
            Enter the amount, who paid, and how to split it.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <ExpenseForm groupId={groupId} members={members} expense={expense} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

export function AddExpenseButton({
  groupId,
  members,
  size = "default",
  label = "Add expense",
}: {
  groupId: string;
  members: Member[];
  size?: "default" | "lg";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const disabled = members.length < 2;

  return (
    <>
      <Button
        size={size}
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={disabled ? "Add at least two members to start splitting" : undefined}
      >
        <Plus />
        {label}
      </Button>
      <ExpenseDialog groupId={groupId} members={members} open={open} onOpenChange={setOpen} />
    </>
  );
}
