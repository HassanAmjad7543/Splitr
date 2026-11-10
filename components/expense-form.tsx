"use client";

import { Loader2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Money } from "@/components/money";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { saveExpense } from "@/lib/actions/expenses";
import { buildShares, type ExpenseDraft } from "@/lib/expense-draft";
import { paisaToInputString, tryParseRupeesToPaisa } from "@/lib/money";
import { formatBasisPoints, parsePercentToBasisPoints, SPLIT_TYPES } from "@/lib/splits";
import { cn, todayLocalISODate } from "@/lib/utils";
import type { Expense, Member } from "@/types";

function initialDraft(members: Member[], expense?: Expense): ExpenseDraft {
  if (!expense) {
    return {
      amount: "",
      paidBy: members[0]?.id ?? "",
      splitType: "equal",
      note: "",
      date: todayLocalISODate(),
      equalMemberIds: members.map((m) => m.id),
      exactAmounts: {},
      percentages: {},
    };
  }
  const inSplit = new Map(expense.splits.map((s) => [s.memberId, s]));
  return {
    amount: paisaToInputString(expense.amount),
    paidBy: expense.paidBy,
    splitType: expense.splitType,
    note: expense.note ?? "",
    date: expense.date,
    equalMemberIds: expense.splitType === "equal" ? [...inSplit.keys()] : members.map((m) => m.id),
    exactAmounts:
      expense.splitType === "exact"
        ? Object.fromEntries(expense.splits.map((s) => [s.memberId, paisaToInputString(s.amountOwed)]))
        : {},
    percentages:
      expense.splitType === "percentage"
        ? Object.fromEntries(expense.splits.map((s) => [s.memberId, formatBasisPoints(s.percentBp ?? 0)]))
        : {},
  };
}

export function ExpenseForm({
  groupId,
  members,
  expense,
  onDone,
}: {
  groupId: string;
  members: Member[];
  expense?: Expense;
  onDone: () => void;
}) {
  const [draft, setDraft] = useState<ExpenseDraft>(() => initialDraft(members, expense));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const update = <K extends keyof ExpenseDraft>(key: K, value: ExpenseDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  // Live preview using exactly the same code the server runs.
  const preview = useMemo(() => buildShares(draft), [draft]);
  const previewShare = new Map(preview.ok ? preview.shares.map((s) => [s.memberId, s.amount]) : []);
  const totalPaisa = tryParseRupeesToPaisa(draft.amount);

  // Running totals for exact / percentage modes so the organizer sees what's left.
  const exactSum = Object.values(draft.exactAmounts).reduce((acc, v) => acc + (tryParseRupeesToPaisa(v) ?? 0), 0);
  const percentSum = Object.values(draft.percentages).reduce((acc, v) => {
    try {
      return acc + parsePercentToBasisPoints(v);
    } catch {
      return acc;
    }
  }, 0);

  function toggleEqual(memberId: string) {
    update(
      "equalMemberIds",
      draft.equalMemberIds.includes(memberId)
        ? draft.equalMemberIds.filter((id) => id !== memberId)
        : [...draft.equalMemberIds, memberId],
    );
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!preview.ok) {
      setError(preview.error);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await saveExpense(groupId, draft, expense?.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(expense ? "Expense updated" : "Expense added");
      onDone();
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div className="grid gap-2">
          <Label htmlFor="expense-amount">Amount (Rs)</Label>
          <Input
            id="expense-amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            value={draft.amount}
            onChange={(e) => update("amount", e.target.value)}
            className="h-12 font-mono text-xl tabular"
            autoFocus={!expense}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="expense-date">Date</Label>
          <Input
            id="expense-date"
            type="date"
            value={draft.date}
            onChange={(e) => update("date", e.target.value)}
            className="h-12 w-[9.5rem]"
            required
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="expense-note">What was it for?</Label>
        <Input
          id="expense-note"
          placeholder="Dinner at Monal, petrol, movie tickets…"
          value={draft.note}
          onChange={(e) => update("note", e.target.value)}
          maxLength={200}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="expense-paid-by">Paid by</Label>
        <NativeSelect id="expense-paid-by" value={draft.paidBy} onChange={(e) => update("paidBy", e.target.value)}>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </NativeSelect>
      </div>

      <fieldset className="grid gap-3">
        <legend className="mb-2 text-sm font-medium">Split</legend>
        <div role="radiogroup" className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
          {SPLIT_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={draft.splitType === t.value}
              onClick={() => update("splitType", t.value)}
              className={cn(
                "h-9 rounded-md px-2 text-sm font-medium transition-colors",
                draft.splitType === t.value
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <ul className="divide-y rounded-lg border">
          {members.map((m) => (
            <li key={m.id} className="flex min-h-12 items-center gap-3 px-3 py-1.5">
              {draft.splitType === "equal" ? (
                <label className="flex flex-1 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={draft.equalMemberIds.includes(m.id)}
                    onChange={() => toggleEqual(m.id)}
                    className="size-5 accent-[var(--primary)]"
                  />
                  <span className="truncate">{m.name}</span>
                </label>
              ) : (
                <label htmlFor={`share-${m.id}`} className="flex-1 truncate">
                  {m.name}
                </label>
              )}

              {draft.splitType === "exact" && (
                <Input
                  id={`share-${m.id}`}
                  inputMode="decimal"
                  placeholder="0"
                  value={draft.exactAmounts[m.id] ?? ""}
                  onChange={(e) => update("exactAmounts", { ...draft.exactAmounts, [m.id]: e.target.value })}
                  className="h-9 w-28 text-right font-mono tabular"
                />
              )}
              {draft.splitType === "percentage" && (
                <div className="flex items-center gap-1.5">
                  <Input
                    id={`share-${m.id}`}
                    inputMode="decimal"
                    placeholder="0"
                    value={draft.percentages[m.id] ?? ""}
                    onChange={(e) => update("percentages", { ...draft.percentages, [m.id]: e.target.value })}
                    className="h-9 w-20 text-right font-mono tabular"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              )}

              {draft.splitType !== "exact" && (
                <span className="w-24 text-right text-sm">
                  {previewShare.has(m.id) ? (
                    <Money paisa={previewShare.get(m.id)!} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>

        {draft.splitType === "exact" && totalPaisa !== null && (
          <SplitProgress
            done={exactSum === totalPaisa}
            label={
              exactSum === totalPaisa ? (
                "Adds up"
              ) : exactSum < totalPaisa ? (
                <>
                  <Money paisa={totalPaisa - exactSum} /> left to assign
                </>
              ) : (
                <>
                  <Money paisa={exactSum - totalPaisa} /> too much
                </>
              )
            }
          />
        )}
        {draft.splitType === "percentage" && (
          <SplitProgress
            done={percentSum === 10_000}
            label={
              percentSum === 10_000
                ? "Adds up to 100%"
                : `${formatBasisPoints(Math.abs(10_000 - percentSum))}% ${percentSum < 10_000 ? "left" : "too much"}`
            }
          />
        )}
        {draft.splitType !== "exact" && (
          <p className="text-xs text-muted-foreground">
            Leftover paisa from rounding go to whoever paid.
          </p>
        )}
      </fieldset>

      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {expense ? "Save changes" : "Add expense"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function SplitProgress({ done, label }: { done: boolean; label: React.ReactNode }) {
  return (
    <p className={cn("text-sm", done ? "text-positive" : "text-muted-foreground")} aria-live="polite">
      {label}
    </p>
  );
}
