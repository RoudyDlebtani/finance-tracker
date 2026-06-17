"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Wallet } from "lucide-react";
import type { Account, AccountType } from "@/lib/types";
import { saveAccount, deleteAccount } from "@/app/dashboard/actions";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useConfirm, useAlert } from "@/components/ui/confirm";

const PALETTE = [
  "#6366f1", "#22c55e", "#f97316", "#ef4444", "#3b82f6",
  "#a855f7", "#ec4899", "#14b8a6", "#eab308", "#64748b",
];

const TYPES: { value: AccountType; label: string }[] = [
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "cash", label: "Cash" },
  { value: "credit", label: "Credit" },
  { value: "investment", label: "Investment" },
];

const TYPE_LABEL = Object.fromEntries(TYPES.map((t) => [t.value, t.label]));

export function AccountsView({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const alert = useAlert();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  const total = accounts.reduce((sum, a) => sum + Number(a.balance), 0);

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Delete account?",
      message: "This can't be undone.",
      confirmText: "Delete",
      danger: true,
    });
    if (!ok) return;
    const fd = new FormData();
    fd.set("id", id);
    const result = await deleteAccount(fd);
    if (!result.ok) {
      await alert({ title: "Couldn't delete", message: result.error });
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Track balances across your wallets and accounts.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> New account
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Total balance</CardTitle>
          <Wallet className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <p
            className={`text-2xl font-bold ${
              total >= 0 ? "text-positive" : "text-negative"
            }`}
          >
            {formatCurrency(total)}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((a) => (
          <Card key={a.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ background: a.color }}
                />
                {a.name}
              </CardTitle>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditing(a);
                    setOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(a.id)}
                >
                  <Trash2 className="h-4 w-4 text-negative" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <p
                className={`text-xl font-bold ${
                  Number(a.balance) >= 0 ? "text-foreground" : "text-negative"
                }`}
              >
                {formatCurrency(Number(a.balance))}
              </p>
              <p className="text-xs text-muted-foreground">
                {TYPE_LABEL[a.type] ?? a.type}
              </p>
            </CardContent>
          </Card>
        ))}
        {accounts.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No accounts yet. Add one to track its balance.
          </p>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit account" : "New account"}
      >
        <AccountForm
          key={editing?.id ?? "new"}
          account={editing}
          onDone={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </Modal>
    </div>
  );
}

function AccountForm({
  account,
  onDone,
}: {
  account: Account | null;
  onDone: () => void;
}) {
  const [color, setColor] = useState(account?.color ?? PALETTE[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await saveAccount(new FormData(e.currentTarget));
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {account && <input type="hidden" name="id" value={account.id} />}
      <input type="hidden" name="color" value={color} />

      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={account?.name ?? ""}
          placeholder="e.g. Main checking"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="type">Type</Label>
          <Select id="type" name="type" defaultValue={account?.type ?? "checking"}>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="balance">Balance</Label>
          <Input
            id="balance"
            name="balance"
            type="number"
            step="0.01"
            required
            defaultValue={account?.balance ?? ""}
            placeholder="0.00"
          />
        </div>
      </div>

      <div>
        <Label>Color</Label>
        <div className="flex flex-wrap gap-2">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={
                "h-8 w-8 rounded-full ring-offset-2 ring-offset-card " +
                (color === c ? "ring-2 ring-ring" : "")
              }
              style={{ background: c }}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-negative">{error}</p>}

      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "Saving…" : "Save account"}
      </Button>
    </form>
  );
}
