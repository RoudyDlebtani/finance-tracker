import {
  addMonths,
  addWeeks,
  addYears,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isWithinInterval,
  parseISO,
  startOfMonth,
  subMonths,
} from "date-fns";
import type { Budget, TransactionWithCategory } from "./types";
import { formatCurrency } from "./utils";

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

export interface Insight {
  id: string;
  tone: "positive" | "negative" | "warning" | "neutral";
  title: string;
  detail: string;
}

/**
 * Derive plain-language "takeaways" about this month's finances, comparing against
 * last month and the user's budgets. Pure — reuses summarize/withinRange/
 * expensesByCategory so it stays unit-testable with no DB access.
 */
export function buildInsights(
  transactions: TransactionWithCategory[],
  budgets: Budget[],
  now: Date = new Date(),
): Insight[] {
  if (transactions.length === 0) {
    return [
      {
        id: "empty",
        tone: "neutral",
        title: "No data yet",
        detail: "Add some transactions to start seeing insights.",
      },
    ];
  }

  const thisMonth = withinRange(transactions, {
    from: startOfMonth(now),
    to: endOfMonth(now),
  });
  const lastMonthDate = subMonths(now, 1);
  const lastMonth = withinRange(transactions, {
    from: startOfMonth(lastMonthDate),
    to: endOfMonth(lastMonthDate),
  });

  const summary = summarize(thisMonth);
  const lastSummary = summarize(lastMonth);
  const insights: Insight[] = [];

  // Savings rate this month.
  if (summary.balance < 0) {
    insights.push({
      id: "savings",
      tone: "negative",
      title: "You spent more than you earned",
      detail: `This month you're down ${formatCurrency(Math.abs(summary.balance))}. Expenses outpaced income.`,
    });
  } else if (summary.income > 0) {
    insights.push({
      id: "savings",
      tone: summary.savingsRate >= 20 ? "positive" : "neutral",
      title: `You saved ${summary.savingsRate.toFixed(0)}% this month`,
      detail: `${formatCurrency(summary.balance)} kept from ${formatCurrency(summary.income)} of income.`,
    });
  }

  // Spending vs last month.
  if (lastSummary.expenses > 0) {
    const change =
      ((summary.expenses - lastSummary.expenses) / lastSummary.expenses) * 100;
    const up = change >= 0;
    insights.push({
      id: "trend",
      tone: Math.abs(change) < 5 ? "neutral" : up ? "negative" : "positive",
      title: `Spending ${up ? "up" : "down"} ${Math.abs(change).toFixed(0)}% vs last month`,
      detail: `${formatCurrency(summary.expenses)} this month vs ${formatCurrency(lastSummary.expenses)} last month.`,
    });
  }

  // Top spending category this month.
  const byCategory = expensesByCategory(thisMonth);
  if (byCategory.length > 0 && summary.expenses > 0) {
    const top = byCategory[0];
    const pct = (top.value / summary.expenses) * 100;
    insights.push({
      id: "top-category",
      tone: "neutral",
      title: `${top.name} is your top category`,
      detail: `${formatCurrency(top.value)} — ${pct.toFixed(0)}% of this month's spending.`,
    });
  }

  // Budget over-runs this month.
  const spendByCategory = new Map<string, number>();
  for (const t of thisMonth) {
    if (t.type !== "expense") continue;
    const key = t.category_id ?? "__none__";
    spendByCategory.set(key, (spendByCategory.get(key) ?? 0) + Number(t.amount));
    spendByCategory.set("__all__", (spendByCategory.get("__all__") ?? 0) + Number(t.amount));
  }
  for (const b of budgets) {
    const spent =
      b.category_id === null
        ? (spendByCategory.get("__all__") ?? 0)
        : (spendByCategory.get(b.category_id) ?? 0);
    if (spent <= Number(b.amount)) continue;
    const name =
      b.category_id === null
        ? "Overall budget"
        : (thisMonth.find((t) => t.category_id === b.category_id)?.category
            ?.name ?? "A category");
    insights.push({
      id: `budget-${b.id}`,
      tone: "warning",
      title: `Over budget: ${name}`,
      detail: `Spent ${formatCurrency(spent)} of a ${formatCurrency(Number(b.amount))} budget.`,
    });
  }

  // Biggest recurring bill.
  const recurring = transactions
    .filter((t) => t.is_recurring && t.type === "expense")
    .sort((a, b) => Number(b.amount) - Number(a.amount));
  if (recurring.length > 0) {
    const top = recurring[0];
    insights.push({
      id: "recurring",
      tone: "neutral",
      title: `${top.category?.name ?? top.note ?? "A recurring bill"} is your biggest recurring cost`,
      detail: `${formatCurrency(Number(top.amount))} every ${top.recurrence_interval ?? "month"}.`,
    });
  }

  return insights;
}
