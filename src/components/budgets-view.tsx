"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";
import { AlertTriangle, Pencil, Trash2 } from "lucide-react";
import type { Budget, Category, TransactionWithCategory } from "@/lib/types";
import { saveBudget, deleteBudget } from "@/app/dashboard/actions";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useConfirm, useAlert } from "@/components/ui/confirm";

interface Props {
  budgets: Budget[];
  categories: Category[];
  transactions: TransactionWithCategory[];
}

export function BudgetsView({ budgets, categories, transactions }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const alert = useAlert();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);

  const refresh = () => {
    setOpen(false);
    setEditing(null);
    router.refresh();
  };

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Delete budget?",
      message: "This can't be undone.",
      confirmText: "Delete",
      danger: true,
    });
    if (!ok) return;
    const fd = new FormData();
    fd.set("id", id);
    const result = await deleteBudget(fd);
    if (!result.ok) {
      await alert({ title: "Couldn't delete", message: result.error });
      return;
    }
    router.refresh();
  }

  const categoryName = (id: string | null) =>
    id ? (categories.find((c) => c.id === id)?.name ?? "") : "Overall (all spending)";

  // Expenses for the current month, grouped by category id (null for the total).
  const { byCategory, total } = useMemo(() => {
    const now = new Date();
    const interval = { start: startOfMonth(now), end: endOfMonth(now) };
    const map = new Map<string, number>();
    let total = 0;
    for (const t of transactions) {
      if (t.type !== "expense") continue;
      if (!isWithinInterval(parseISO(t.date), interval)) continue;
      total += Number(t.amount);
      if (t.category_id)
        map.set(t.category_id, (map.get(t.category_id) ?? 0) + Number(t.amount));
    }
    return { byCategory: map, total };
  }, [transactions]);

  const overall = budgets.find((b) => b.category_id === null);
  const budgetByCategory = new Map(
    budgets.filter((b) => b.category_id).map((b) => [b.category_id!, b]),
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Budgets</h1>
          <p className="text-sm text-muted-foreground">
            Monthly limits and how you&apos;re tracking against them.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Pencil className="h-4 w-4" /> Set budget
        </Button>
      </div>

      {/* Overall budget */}
      {overall && (
        <BudgetBar
          label="Overall monthly budget"
          spent={total}
          limit={Number(overall.amount)}
          onEdit={() => {
            setEditing(overall);
            setOpen(true);
          }}
          onDelete={() => handleDelete(overall.id)}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories
          .filter((c) => budgetByCategory.has(c.id))
          .map((c) => {
            const b = budgetByCategory.get(c.id)!;
            return (
              <BudgetBar
                key={c.id}
                label={c.name}
                color={c.color}
                spent={byCategory.get(c.id) ?? 0}
                limit={Number(b.amount)}
                onEdit={() => {
                  setEditing(b);
                  setOpen(true);
                }}
                onDelete={() => handleDelete(b.id)}
              />
            );
          })}
      </div>

      {budgets.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No budgets set yet. Click “Set budget” to add one.
          </CardContent>
        </Card>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit budget" : "Set a budget"}
      >
        <BudgetForm
          key={editing?.id ?? "new"}
          categories={categories}
          budget={editing}
          categoryLabel={editing ? categoryName(editing.category_id) : ""}
          onDone={refresh}
        />
      </Modal>
    </div>
  );
}

function BudgetBar({
  label,
  color,
  spent,
  limit,
  onEdit,
  onDelete,
}: {
  label: string;
  color?: string;
  spent: number;
  limit: number;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const pct = limit > 0 ? (spent / limit) * 100 : 0;
  const over = spent > limit;
  const near = !over && pct >= 80;
  const indicator = over
    ? "bg-negative"
    : near
      ? "bg-yellow-500"
      : "bg-positive";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-foreground">
          {color && (
            <span
              className="h-3 w-3 rounded-full"
              style={{ background: color }}
            />
          )}
          {label}
        </CardTitle>
        <div className="flex items-center gap-1">
          {over && <AlertTriangle className="h-4 w-4 text-negative" />}
          {onEdit && (
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-negative" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className={over ? "font-semibold text-negative" : ""}>
            {formatCurrency(spent)}
          </span>
          <span className="text-muted-foreground">
            of {formatCurrency(limit)}
          </span>
        </div>
        <Progress value={pct} indicatorClassName={indicator} />
        {over && (
          <p className="text-xs text-negative">
            Over budget by {formatCurrency(spent - limit)}
          </p>
        )}
        {near && (
          <p className="text-xs text-yellow-600">
            {pct.toFixed(0)}% used — getting close.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function BudgetForm({
  categories,
  budget,
  categoryLabel,
  onDone,
}: {
  categories: Category[];
  budget: Budget | null;
  categoryLabel: string;
  onDone: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await saveBudget(new FormData(e.currentTarget));
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="category_id">Applies to</Label>
        {budget ? (
          <>
            <input
              type="hidden"
              name="category_id"
              value={budget.category_id ?? ""}
            />
            <p className="mt-1 text-sm text-foreground">{categoryLabel}</p>
          </>
        ) : (
          <Select id="category_id" name="category_id" defaultValue="">
            <option value="">Overall (all spending)</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        )}
      </div>
      <div>
        <Label htmlFor="amount">Monthly limit</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          min="0"
          step="0.01"
          required
          defaultValue={budget?.amount ?? ""}
          placeholder="0.00"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Set to 0 to remove an existing budget.
        </p>
      </div>
      {error && <p className="text-sm text-negative">{error}</p>}

      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "Saving…" : "Save budget"}
      </Button>
    </form>
  );
}
