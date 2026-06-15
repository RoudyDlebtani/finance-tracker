export type TransactionType = "income" | "expense";
export type RecurrenceInterval = "weekly" | "monthly" | "yearly";
export type BudgetPeriod = "monthly";

export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  category_id: string | null;
  amount: number;
  type: TransactionType;
  date: string; // ISO date (yyyy-mm-dd)
  note: string | null;
  is_recurring: boolean;
  recurrence_interval: RecurrenceInterval | null;
  created_at: string;
}

/** A transaction joined with its category, as returned by the dashboard queries. */
export interface TransactionWithCategory extends Transaction {
  category: Pick<Category, "id" | "name" | "color" | "icon"> | null;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string | null; // null = overall budget
  amount: number;
  period: BudgetPeriod;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  created_at: string;
}
