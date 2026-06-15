import { describe, it, expect } from "vitest";
import { addMonths, format } from "date-fns";
import {
  summarize,
  withinRange,
  monthlySeries,
  expensesByCategory,
  upcomingRecurring,
} from "./finance";
import type { TransactionWithCategory } from "./types";

let seq = 0;
function tx(partial: Partial<TransactionWithCategory>): TransactionWithCategory {
  return {
    id: `t${seq++}`,
    user_id: "u1",
    category_id: null,
    amount: 0,
    type: "expense",
    date: "2026-01-01",
    note: null,
    is_recurring: false,
    recurrence_interval: null,
    created_at: "2026-01-01T00:00:00Z",
    category: null,
    ...partial,
  };
}

describe("summarize", () => {
  it("sums income and expenses and derives balance + savings rate", () => {
    const result = summarize([
      tx({ type: "income", amount: 1000 }),
      tx({ type: "expense", amount: 250 }),
      tx({ type: "expense", amount: 150 }),
    ]);
    expect(result).toEqual({
      income: 1000,
      expenses: 400,
      balance: 600,
      savingsRate: 60,
    });
  });

  it("returns a 0 savings rate when there is no income", () => {
    const result = summarize([tx({ type: "expense", amount: 80 })]);
    expect(result.savingsRate).toBe(0);
    expect(result.balance).toBe(-80);
  });

  it("handles string amounts (numeric columns come back as strings)", () => {
    const result = summarize([
      tx({ type: "income", amount: "100" as unknown as number }),
      tx({ type: "expense", amount: "40" as unknown as number }),
    ]);
    expect(result).toEqual({
      income: 100,
      expenses: 40,
      balance: 60,
      savingsRate: 60,
    });
  });
});

describe("withinRange", () => {
  // Local-time bounds, matching how the app builds ranges (date-fns
  // startOfMonth/endOfMonth) and how parseISO reads "yyyy-MM-dd" dates.
  const range = {
    from: new Date("2026-03-01T00:00:00"),
    to: new Date("2026-03-31T23:59:59"),
  };

  it("includes the inclusive boundaries and excludes outside dates", () => {
    const inside = [
      tx({ date: "2026-03-01" }),
      tx({ date: "2026-03-15" }),
      tx({ date: "2026-03-31" }),
    ];
    const outside = [tx({ date: "2026-02-28" }), tx({ date: "2026-04-01" })];
    const result = withinRange([...inside, ...outside], range);
    expect(result).toHaveLength(3);
    expect(result.map((t) => t.date)).toEqual([
      "2026-03-01",
      "2026-03-15",
      "2026-03-31",
    ]);
  });
});

describe("monthlySeries", () => {
  it("buckets by month and sorts chronologically", () => {
    const series = monthlySeries([
      tx({ date: "2026-02-10", type: "income", amount: 500 }),
      tx({ date: "2026-01-05", type: "expense", amount: 100 }),
      tx({ date: "2026-01-20", type: "income", amount: 200 }),
      tx({ date: "2026-02-15", type: "expense", amount: 50 }),
    ]);
    expect(series).toEqual([
      { month: "Jan 2026", income: 200, expenses: 100 },
      { month: "Feb 2026", income: 500, expenses: 50 },
    ]);
  });

  it("returns an empty array for no transactions", () => {
    expect(monthlySeries([])).toEqual([]);
  });
});

describe("expensesByCategory", () => {
  const food = { id: "c1", name: "Food", color: "#f97316", icon: "utensils" };

  it("aggregates expenses, ignores income, and sorts by value desc", () => {
    const slices = expensesByCategory([
      tx({ type: "expense", amount: 30, category_id: "c1", category: food }),
      tx({ type: "expense", amount: 20, category_id: "c1", category: food }),
      tx({ type: "income", amount: 999, category_id: "c1", category: food }),
      tx({ type: "expense", amount: 70 }), // no category
    ]);
    expect(slices).toEqual([
      { name: "Uncategorized", value: 70, color: "#94a3b8" },
      { name: "Food", value: 50, color: "#f97316" },
    ]);
  });
});

describe("upcomingRecurring", () => {
  const past = format(addMonths(new Date(), -10), "yyyy-MM-dd");

  it("ignores non-recurring entries and those without an interval", () => {
    const result = upcomingRecurring([
      tx({ date: past, is_recurring: false }),
      tx({ date: past, is_recurring: true, recurrence_interval: null }),
    ]);
    expect(result).toHaveLength(0);
  });

  it("expands occurrences within the horizon, sorted ascending", () => {
    const result = upcomingRecurring(
      [tx({ date: past, is_recurring: true, recurrence_interval: "monthly" })],
      3,
    );
    const now = new Date();
    const horizon = addMonths(now, 3);
    expect(result.length).toBeGreaterThanOrEqual(3);
    for (const occ of result) {
      expect(occ.date.getTime()).toBeGreaterThanOrEqual(now.getTime() - 1000);
      expect(occ.date.getTime()).toBeLessThanOrEqual(horizon.getTime());
    }
    const times = result.map((o) => o.date.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it("produces more weekly occurrences than monthly over the same window", () => {
    const weekly = upcomingRecurring(
      [tx({ date: past, is_recurring: true, recurrence_interval: "weekly" })],
      3,
    );
    const monthly = upcomingRecurring(
      [tx({ date: past, is_recurring: true, recurrence_interval: "monthly" })],
      3,
    );
    expect(weekly.length).toBeGreaterThan(monthly.length);
  });

  it("yields nothing when the next occurrence is beyond the horizon", () => {
    const future = format(addMonths(new Date(), 8), "yyyy-MM-dd");
    const result = upcomingRecurring(
      [tx({ date: future, is_recurring: true, recurrence_interval: "yearly" })],
      3,
    );
    expect(result).toHaveLength(0);
  });
});
