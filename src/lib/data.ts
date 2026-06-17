import { createClient } from "@/lib/supabase/server";
import type {
  Account,
  Budget,
  Category,
  Goal,
  Profile,
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

export async function getAccounts(): Promise<Account[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("accounts")
    .select("*")
    .order("created_at", { ascending: true });
  return data ?? [];
}

/** The current user's preferences, with sane defaults when no row exists yet. */
export async function getProfile(): Promise<Profile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data } = await supabase.from("profiles").select("*").maybeSingle();
  return (
    data ?? {
      user_id: user?.id ?? "",
      display_name: null,
      currency: "USD",
      created_at: new Date().toISOString(),
    }
  );
}
