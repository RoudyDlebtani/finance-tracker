import { createClient } from "@/lib/supabase/server";
import type {
  Budget,
  Category,
  Goal,
  TransactionWithCategory,
} from "@/lib/types";

/** Returns the currently authenticated user, or null. */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .order("name");
  return data ?? [];
}

export async function getTransactions(): Promise<TransactionWithCategory[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("transactions")
    .select("*, category:categories(id, name, color, icon)")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  return (data as TransactionWithCategory[]) ?? [];
}

export async function getBudgets(): Promise<Budget[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("budgets").select("*");
  return data ?? [];
}

export async function getGoals(): Promise<Goal[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("goals")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}
