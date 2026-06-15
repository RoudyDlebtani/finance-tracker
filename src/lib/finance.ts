import {
  addMonths,
  addWeeks,
  addYears,
  format,
  isAfter,
  isBefore,
  isWithinInterval,
  parseISO,
  startOfMonth,
} from "date-fns";
import type { TransactionWithCategory } from "./types";

export interface DateRange {
  from: Date;
  to: Date;
}

export interface Summary {
  income: number;
  expenses: number;
  balance: number;
  savingsRate: number; // 0-100
}

/** Sum income/expenses for a list of transactions. */
export function summarize(transactions: TransactionWithCategory[]): Summary {
  let income = 0;
  let expenses = 0;
  for (const t of transactions) {
    if (t.type === "income") income += Number(t.amount);
    else expenses += Number(t.amount);
  }
  const balance = income - expenses;
  const savingsRate = income > 0 ? (balance / income) * 100 : 0;
  return { income, expenses, balance, savingsRate };
}

/** Filter transactions that fall within a date range (inclusive). */
export function withinRange(
  transactions: TransactionWithCategory[],
  range: DateRange,
): TransactionWithCategory[] {
  return transactions.filter((t) =>
    isWithinInterval(parseISO(t.date), { start: range.from, end: range.to }),
  );
}

export interface MonthlyPoint {
  month: string; // "Jan 2026"
  income: number;
  expenses: number;
}

/** Group transactions into monthly income/expense totals, sorted chronologically. */
export function monthlySeries(
  transactions: TransactionWithCategory[],
): MonthlyPoint[] {
  const buckets = new Map<string, MonthlyPoint & { sort: number }>();
  for (const t of transactions) {
    const d = startOfMonth(parseISO(t.date));
    const key = format(d, "MMM yyyy");
    const existing =
      buckets.get(key) ??
      { month: key, income: 0, expenses: 0, sort: d.getTime() };
    if (t.type === "income") existing.income += Number(t.amount);
    else existing.expenses += Number(t.amount);
    buckets.set(key, existing);
  }
  return [...buckets.values()]
    .sort((a, b) => a.sort - b.sort)
    .map(({ month, income, expenses }) => ({ month, income, expenses }));
}

export interface CategorySlice {
  name: string;
  value: number;
  color: string;
}

/** Aggregate expenses by category for a pie/donut chart. */
export function expensesByCategory(
  transactions: TransactionWithCategory[],
): CategorySlice[] {
  const buckets = new Map<string, CategorySlice>();
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    const name = t.category?.name ?? "Uncategorized";
    const color = t.category?.color ?? "#94a3b8";
    const existing = buckets.get(name) ?? { name, value: 0, color };
    existing.value += Number(t.amount);
    buckets.set(name, existing);
  }
  return [...buckets.values()].sort((a, b) => b.value - a.value);
}

/**
 * Expand recurring transactions into concrete upcoming occurrences within a
 * window. Computed on read so we never need a background job (free-tier friendly).
 */
export function upcomingRecurring(
  transactions: TransactionWithCategory[],
  monthsAhead = 3,
): { transaction: TransactionWithCategory; date: Date }[] {
  const now = new Date();
  const horizon = addMonths(now, monthsAhead);
  const result: { transaction: TransactionWithCategory; date: Date }[] = [];

  for (const t of transactions) {
    if (!t.is_recurring || !t.recurrence_interval) continue;
    let next = parseISO(t.date);
    const step = (d: Date) =>
      t.recurrence_interval === "weekly"
        ? addWeeks(d, 1)
        : t.recurrence_interval === "yearly"
          ? addYears(d, 1)
          : addMonths(d, 1);

    // Advance to the first occurrence at or after "now".
    let guard = 0;
    while (isBefore(next, now) && guard < 500) {
      next = step(next);
      guard++;
    }
    // Collect occurrences up to the horizon.
    while (!isAfter(next, horizon) && guard < 500) {
      result.push({ transaction: t, date: next });
      next = step(next);
      guard++;
    }
  }

  return result.sort((a, b) => a.date.getTime() - b.date.getTime());
}
