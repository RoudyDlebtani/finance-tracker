"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Download, Pencil, Trash2, Search } from "lucide-react";
import type { Category, TransactionWithCategory } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { downloadTransactionsCsv } from "@/lib/csv";
import { saveTransaction, deleteTransaction } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { useConfirm, useAlert } from "@/components/ui/confirm";

type SortKey = "date" | "amount";

interface Props {
  transactions: TransactionWithCategory[];
  categories: Category[];
}

export function TransactionsView({ transactions, categories }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const alert = useAlert();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sort, setSort] = useState<SortKey>("date");
  const [editing, setEditing] = useState<TransactionWithCategory | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    return transactions
      .filter((t) => {
        if (typeFilter !== "all" && t.type !== typeFilter) return false;
        if (categoryFilter !== "all" && t.category_id !== categoryFilter)
          return false;
        if (
          search &&
          !(t.note ?? "").toLowerCase().includes(search.toLowerCase()) &&
          !(t.category?.name ?? "").toLowerCase().includes(search.toLowerCase())
        )
          return false;
        return true;
      })
      .sort((a, b) =>
        sort === "amount"
          ? Number(b.amount) - Number(a.amount)
          : b.date.localeCompare(a.date),
      );
  }, [transactions, search, typeFilter, categoryFilter, sort]);

  function openNew() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(t: TransactionWithCategory) {
    setEditing(t);
    setOpen(true);
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Delete transaction?",
      message: "This can't be undone.",
      confirmText: "Delete",
      danger: true,
    });
    if (!ok) return;
    const fd = new FormData();
    fd.set("id", id);
    const result = await deleteTransaction(fd);
    if (!result.ok) {
      await alert({ title: "Couldn't delete", message: result.error });
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {transactions.length} shown
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => downloadTransactionsCsv(filtered)}
            disabled={filtered.length === 0}
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> Add transaction
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search note or category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </Select>
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="date">Sort by date</option>
            <option value="amount">Sort by amount</option>
          </Select>
        </div>
      </Card>

      {/* List */}
      <Card>
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No transactions match your filters. Add one to get started.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50"
              >
                <span
                  className="h-9 w-9 shrink-0 rounded-full"
                  style={{ background: (t.category?.color ?? "#94a3b8") + "33" }}
                >
                  <span
                    className="block h-full w-full rounded-full border-2"
                    style={{ borderColor: t.category?.color ?? "#94a3b8" }}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {t.note || t.category?.name || "Transaction"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.category?.name ?? "Uncategorized"} · {formatDate(t.date)}
                    {t.is_recurring && " · recurring"}
                  </p>
                </div>
                <span
                  className={
                    t.type === "income"
                      ? "font-semibold text-positive"
                      : "font-semibold text-negative"
                  }
                >
                  {t.type === "income" ? "+" : "−"}
                  {formatCurrency(Number(t.amount))}
                </span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(t.id)}
                  >
                    <Trash2 className="h-4 w-4 text-negative" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit transaction" : "Add transaction"}
      >
        <TransactionForm
          key={editing?.id ?? "new"}
          transaction={editing}
          categories={categories}
          onDone={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </Modal>
    </div>
  );
}

function TransactionForm({
  transaction,
  categories,
  onDone,
}: {
  transaction: TransactionWithCategory | null;
  categories: Category[];
  onDone: () => void;
}) {
  const [recurring, setRecurring] = useState(transaction?.is_recurring ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await saveTransaction(new FormData(e.currentTarget));
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {transaction && <input type="hidden" name="id" value={transaction.id} />}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="type">Type</Label>
          <Select
            id="type"
            name="type"
            defaultValue={transaction?.type ?? "expense"}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={transaction?.amount ?? ""}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="category_id">Category</Label>
          <Select
            id="category_id"
            name="category_id"
            defaultValue={transaction?.category_id ?? ""}
          >
            <option value="">Uncategorized</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={transaction?.date ?? today}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="note">Note</Label>
        <Textarea
          id="note"
          name="note"
          rows={2}
          defaultValue={transaction?.note ?? ""}
          placeholder="Optional description"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="is_recurring"
          name="is_recurring"
          type="checkbox"
          checked={recurring}
          onChange={(e) => setRecurring(e.target.checked)}
          className="h-4 w-4"
        />
        <Label htmlFor="is_recurring" className="mb-0">
          Recurring
        </Label>
        {recurring && (
          <Select
            name="recurrence_interval"
            defaultValue={transaction?.recurrence_interval ?? "monthly"}
            className="ml-auto w-32"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </Select>
        )}
      </div>

      {error && <p className="text-sm text-negative">{error}</p>}

      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "Saving…" : "Save transaction"}
      </Button>
    </form>
  );
}
