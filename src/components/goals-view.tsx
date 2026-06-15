"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Check } from "lucide-react";
import type { Goal } from "@/lib/types";
import {
  saveGoal,
  deleteGoal,
  contributeToGoal,
} from "@/app/dashboard/actions";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";

export function GoalsView({ goals }: { goals: Goal[] }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [contributing, setContributing] = useState<Goal | null>(null);

  const refresh = () => {
    setEditOpen(false);
    setContributing(null);
    router.refresh();
  };

  async function handleDelete(id: string) {
    if (!confirm("Delete this goal?")) return;
    const fd = new FormData();
    fd.set("id", id);
    const result = await deleteGoal(fd);
    if (!result.ok) {
      alert(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Savings goals</h1>
          <p className="text-sm text-muted-foreground">
            Track progress toward what you&apos;re saving for.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setEditOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> New goal
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {goals.map((g) => {
          const pct =
            Number(g.target_amount) > 0
              ? (Number(g.current_amount) / Number(g.target_amount)) * 100
              : 0;
          const done = pct >= 100;
          return (
            <Card key={g.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  {done && <Check className="h-4 w-4 text-positive" />}
                  {g.name}
                </CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditing(g);
                      setEditOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(g.id)}
                  >
                    <Trash2 className="h-4 w-4 text-negative" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">
                    {formatCurrency(Number(g.current_amount))}
                  </span>
                  <span className="text-muted-foreground">
                    of {formatCurrency(Number(g.target_amount))}
                  </span>
                </div>
                <Progress
                  value={pct}
                  indicatorClassName={done ? "bg-positive" : "bg-primary"}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {pct.toFixed(0)}%
                    {g.deadline && ` · by ${formatDate(g.deadline)}`}
                  </span>
                  {!done && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setContributing(g)}
                    >
                      Add funds
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {goals.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No goals yet. Create one to start saving.
          </p>
        )}
      </div>

      {/* Create / edit */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={editing ? "Edit goal" : "New goal"}
      >
        <GoalForm key={editing?.id ?? "new"} goal={editing} onDone={refresh} />
      </Modal>

      {/* Contribute */}
      <Modal
        open={!!contributing}
        onClose={() => setContributing(null)}
        title={`Add funds to ${contributing?.name ?? ""}`}
      >
        {contributing && (
          <ContributeForm goal={contributing} onDone={refresh} />
        )}
      </Modal>
    </div>
  );
}

function GoalForm({ goal, onDone }: { goal: Goal | null; onDone: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await saveGoal(new FormData(e.currentTarget));
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDone();
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {goal && <input type="hidden" name="id" value={goal.id} />}
      <div>
        <Label htmlFor="name">Goal name</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={goal?.name ?? ""}
          placeholder="e.g. Emergency fund"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="target_amount">Target</Label>
          <Input
            id="target_amount"
            name="target_amount"
            type="number"
            min="1"
            step="0.01"
            required
            defaultValue={goal?.target_amount ?? ""}
            placeholder="0.00"
          />
        </div>
        <div>
          <Label htmlFor="deadline">Deadline</Label>
          <Input
            id="deadline"
            name="deadline"
            type="date"
            defaultValue={goal?.deadline ?? ""}
          />
        </div>
      </div>
      {error && <p className="text-sm text-negative">{error}</p>}
      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "Saving…" : "Save goal"}
      </Button>
    </form>
  );
}

function ContributeForm({ goal, onDone }: { goal: Goal; onDone: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await contributeToGoal(new FormData(e.currentTarget));
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDone();
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="id" value={goal.id} />
      <div>
        <Label htmlFor="amount">Amount to add</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          required
          placeholder="0.00"
        />
      </div>
      {error && <p className="text-sm text-negative">{error}</p>}
      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "Saving…" : "Add funds"}
      </Button>
    </form>
  );
}
