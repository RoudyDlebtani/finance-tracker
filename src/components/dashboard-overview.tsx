"use client";

import { useMemo, useState } from "react";
import {
  startOfMonth,
  startOfYear,
  subMonths,
  endOfDay,
} from "date-fns";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
} from "lucide-react";
import type { TransactionWithCategory } from "@/lib/types";
import {
  summarize,
  withinRange,
  monthlySeries,
  expensesByCategory,
  upcomingRecurring,
  type DateRange,
} from "@/lib/finance";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import {
  IncomeExpenseChart,
  CategoryPieChart,
  MonthlyBarChart,
} from "@/components/charts";

const RANGES = {
  "this-month": "This month",
  "3m": "Last 3 months",
  "6m": "Last 6 months",
  ytd: "This year",
  all: "All time",
} as const;
type RangeKey = keyof typeof RANGES;

function rangeFor(key: RangeKey): DateRange {
  const now = endOfDay(new Date());
  switch (key) {
    case "this-month":
      return { from: startOfMonth(now), to: now };
    case "3m":
      return { from: startOfMonth(subMonths(now, 2)), to: now };
    case "6m":
      return { from: startOfMonth(subMonths(now, 5)), to: now };
    case "ytd":
      return { from: startOfYear(now), to: now };
    case "all":
      return { from: new Date(2000, 0, 1), to: now };
  }
}

export function DashboardOverview({
  transactions,
}: {
  transactions: TransactionWithCategory[];
}) {
  const [rangeKey, setRangeKey] = useState<RangeKey>("6m");

  const view = useMemo(() => {
    const range = rangeFor(rangeKey);
    const inRange = withinRange(transactions, range);
    return {
      summary: summarize(inRange),
      monthly: monthlySeries(inRange),
      byCategory: expensesByCategory(inRange),
      recent: inRange.slice(0, 6),
      upcoming: upcomingRecurring(transactions).slice(0, 5),
    };
  }, [transactions, rangeKey]);

  const { summary } = view;

  const cards = [
    {
      title: "Income",
      value: formatCurrency(summary.income),
      icon: TrendingUp,
      tone: "text-positive",
    },
    {
      title: "Expenses",
      value: formatCurrency(summary.expenses),
      icon: TrendingDown,
      tone: "text-negative",
    },
    {
      title: "Net balance",
      value: formatCurrency(summary.balance),
      icon: Wallet,
      tone: summary.balance >= 0 ? "text-positive" : "text-negative",
    },
    {
      title: "Savings rate",
      value: `${summary.savingsRate.toFixed(0)}%`,
      icon: PiggyBank,
      tone: "text-primary",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Overview</h1>
          <p className="text-sm text-muted-foreground">
            Your finances for {RANGES[rangeKey].toLowerCase()}.
          </p>
        </div>
        <Select
          value={rangeKey}
          onChange={(e) => setRangeKey(e.target.value as RangeKey)}
          className="w-44"
        >
          {Object.entries(RANGES).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{c.title}</CardTitle>
              <c.icon className={`h-4 w-4 ${c.tone}`} />
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${c.tone}`}>{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Income vs. expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <IncomeExpenseChart data={view.monthly} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Spending by category</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryPieChart data={view.byCategory} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyBarChart data={view.monthly} />
        </CardContent>
      </Card>

      {/* Recent + upcoming */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent transactions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {view.recent.length === 0 && (
              <p className="text-sm text-muted-foreground">Nothing yet.</p>
            )}
            {view.recent.map((t) => (
              <div key={t.id} className="flex items-center justify-between text-sm">
                <span className="truncate">
                  {t.note || t.category?.name || "Transaction"}
                </span>
                <span
                  className={
                    t.type === "income" ? "text-positive" : "text-negative"
                  }
                >
                  {t.type === "income" ? "+" : "−"}
                  {formatCurrency(Number(t.amount))}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming recurring</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {view.upcoming.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No recurring transactions scheduled.
              </p>
            )}
            {view.upcoming.map(({ transaction: t, date }, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="truncate">
                  {t.note || t.category?.name || "Transaction"}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {formatDate(date)}
                  </span>
                </span>
                <span
                  className={
                    t.type === "income" ? "text-positive" : "text-negative"
                  }
                >
                  {t.type === "income" ? "+" : "−"}
                  {formatCurrency(Number(t.amount))}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
