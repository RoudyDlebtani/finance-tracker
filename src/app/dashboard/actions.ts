"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  type ActionResult,
  parseForm,
  transactionSchema,
  categorySchema,
  budgetSchema,
  goalSchema,
  contributeSchema,
  deleteSchema,
} from "@/lib/validation";

/** Get the authenticated user id or throw — every action must be authorized. */
async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

function revalidateAll() {
  revalidatePath("/dashboard", "layout");
}

function fail(message: string): ActionResult {
  return { ok: false, error: message };
}

// ---------- Transactions ----------

export async function saveTransaction(formData: FormData): Promise<ActionResult> {
  const parsed = parseForm(transactionSchema, formData);
  if (!parsed.ok) return parsed;
  const { id, ...data } = parsed.data;

  const { supabase, userId } = await requireUser();
  const payload = {
    user_id: userId,
    category_id: data.category_id,
    amount: data.amount,
    type: data.type,
    date: data.date,
    note: data.note,
    is_recurring: data.is_recurring,
    recurrence_interval: data.is_recurring ? data.recurrence_interval : null,
  };

  const { error } = id
    ? await supabase.from("transactions").update(payload).eq("id", id)
    : await supabase.from("transactions").insert(payload);
  if (error) return fail(error.message);

  revalidateAll();
  return { ok: true };
}

export async function deleteTransaction(formData: FormData): Promise<ActionResult> {
  const parsed = parseForm(deleteSchema, formData);
  if (!parsed.ok) return parsed;
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", parsed.data.id);
  if (error) return fail(error.message);
  revalidateAll();
  return { ok: true };
}

// ---------- Categories ----------

export async function saveCategory(formData: FormData): Promise<ActionResult> {
  const parsed = parseForm(categorySchema, formData);
  if (!parsed.ok) return parsed;
  const { id, name, color, icon } = parsed.data;

  const { supabase, userId } = await requireUser();
  const payload = { user_id: userId, name, color, icon };

  const { error } = id
    ? await supabase.from("categories").update(payload).eq("id", id)
    : await supabase.from("categories").insert(payload);
  if (error) return fail(error.message);

  revalidateAll();
  return { ok: true };
}

export async function deleteCategory(formData: FormData): Promise<ActionResult> {
  const parsed = parseForm(deleteSchema, formData);
  if (!parsed.ok) return parsed;
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", parsed.data.id);
  if (error) return fail(error.message);
  revalidateAll();
  return { ok: true };
}

// ---------- Budgets ----------

export async function saveBudget(formData: FormData): Promise<ActionResult> {
  const parsed = parseForm(budgetSchema, formData);
  if (!parsed.ok) return parsed;
  const { category_id, amount } = parsed.data;

  const { supabase } = await requireUser();
  // `set_budget` upserts (or deletes when amount is 0) atomically server-side,
  // treating a null category_id — the overall budget — as a single slot.
  const { error } = await supabase.rpc("set_budget", {
    p_category_id: category_id,
    p_amount: amount,
  });
  if (error) return fail(error.message);

  revalidateAll();
  return { ok: true };
}

export async function deleteBudget(formData: FormData): Promise<ActionResult> {
  const parsed = parseForm(deleteSchema, formData);
  if (!parsed.ok) return parsed;
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("budgets")
    .delete()
    .eq("id", parsed.data.id);
  if (error) return fail(error.message);
  revalidateAll();
  return { ok: true };
}

// ---------- Goals ----------

export async function saveGoal(formData: FormData): Promise<ActionResult> {
  const parsed = parseForm(goalSchema, formData);
  if (!parsed.ok) return parsed;
  const { id, name, target_amount, deadline } = parsed.data;

  const { supabase, userId } = await requireUser();
  // Editing never touches current_amount (contributions own that balance);
  // new goals start at the DB default of 0.
  const { error } = id
    ? await supabase
        .from("goals")
        .update({ name, target_amount, deadline })
        .eq("id", id)
    : await supabase
        .from("goals")
        .insert({ user_id: userId, name, target_amount, deadline });
  if (error) return fail(error.message);

  revalidateAll();
  return { ok: true };
}

export async function contributeToGoal(formData: FormData): Promise<ActionResult> {
  const parsed = parseForm(contributeSchema, formData);
  if (!parsed.ok) return parsed;
  const { supabase } = await requireUser();
  // Atomic increment in Postgres — no read-modify-write race, and the balance
  // can't be set to an arbitrary client-supplied value.
  const { error } = await supabase.rpc("increment_goal", {
    p_goal_id: parsed.data.id,
    p_amount: parsed.data.amount,
  });
  if (error) return fail(error.message);

  revalidateAll();
  return { ok: true };
}

export async function deleteGoal(formData: FormData): Promise<ActionResult> {
  const parsed = parseForm(deleteSchema, formData);
  if (!parsed.ok) return parsed;
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("goals")
    .delete()
    .eq("id", parsed.data.id);
  if (error) return fail(error.message);
  revalidateAll();
  return { ok: true };
}
