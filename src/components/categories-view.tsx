"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Category } from "@/lib/types";
import { saveCategory, deleteCategory } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";

const PALETTE = [
  "#6366f1", "#22c55e", "#f97316", "#ef4444", "#3b82f6",
  "#a855f7", "#ec4899", "#14b8a6", "#eab308", "#64748b",
];

export function CategoriesView({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this category? Its transactions become uncategorized."))
      return;
    const fd = new FormData();
    fd.set("id", id);
    const result = await deleteCategory(fd);
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
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-sm text-muted-foreground">
            Organize and color-code your spending.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Add category
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <Card key={c.id} className="flex items-center gap-3 p-4">
            <span
              className="h-8 w-8 rounded-full"
              style={{ background: c.color }}
            />
            <span className="flex-1 font-medium">{c.name}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setEditing(c);
                setOpen(true);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
              <Trash2 className="h-4 w-4 text-negative" />
            </Button>
          </Card>
        ))}
        {categories.length === 0 && (
          <p className="text-sm text-muted-foreground">No categories yet.</p>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit category" : "Add category"}
      >
        <CategoryForm
          key={editing?.id ?? "new"}
          category={editing}
          onDone={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </Modal>
    </div>
  );
}

function CategoryForm({
  category,
  onDone,
}: {
  category: Category | null;
  onDone: () => void;
}) {
  const [color, setColor] = useState(category?.color ?? PALETTE[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await saveCategory(new FormData(e.currentTarget));
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {category && <input type="hidden" name="id" value={category.id} />}
      <input type="hidden" name="color" value={color} />
      <input type="hidden" name="icon" value={category?.icon ?? "circle"} />

      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={category?.name ?? ""}
          placeholder="e.g. Groceries"
        />
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
        {saving ? "Saving…" : "Save category"}
      </Button>
    </form>
  );
}
