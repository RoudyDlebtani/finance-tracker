"use client";

import { useMemo, useState } from "react";
import { Repeat, CalendarClock } from "lucide-react";
import type { TransactionWithCategory } from "@/lib/types";
import { upcomingRecurring } from "@/lib/finance";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/field";

const HORIZONS = {
  "3": "Next 3 months",
  "6": "Next 6 months",
  "12": "Next 12 months",
} as const;
type HorizonKey = keyof typeof HORIZONS;

const INTERVAL_LABEL = {
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
} as const;

export function RecurringView({
  transactions,
}: {
  transactions: TransactionWithCategory[];
}) {
  const [horizon, setHorizon] = useState<HorizonKey>("3");

  const view = useMemo(() => {
    const sources = transactions.filter((t) => t.is_recurring);
    const upcoming = upcomingRecurring(transactions, Number(horizon));
    const projected = upcoming.reduce(
      (acc, { transaction: t }) => {
        if (t.type === "income") acc.income += Number(t.amount);
        else acc.expenses += Number(t.amount);
        return acc;
      },
      { income: 0, expenses: 0 },
    );
    return { sources, upcoming, projected };
  }, [transactions, horizon]);

  const net = view.projected.income - view.projected.expenses;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Recurring</h1>
          <p className="text-sm text-muted-foreground">
            Upcoming bills and income, expanded over {HORIZONS[horizon].toLowerCase()}.
          </p>
        </div>
        <Select
          value={horizon}
          onChange={(e) => setHorizon(e.target.value as HorizonKey)}
          className="w-44"
        >
          {Object.entries(HORIZONS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      {/* Projected totals */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Projected income</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-positive">
              {formatCurrency(view.projected.income)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Projected expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-negative">
              {formatCurrency(view.projected.expenses)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Net</CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${
                net >= 0 ? "text-positive" : "text-negative"
              }`}
            >
              {formatCurrency(net)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recurring sources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Repeat className="h-4 w-4" /> Recurring entries
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {view.sources.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No recurring transactions. Mark a transaction as recurring to see
                it here.
              </p>
            )}
            {view.sources.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="flex items-center gap-2 truncate">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: t.category?.color ?? "#94a3b8" }}
                  />
                  <span className="truncate">
                    {t.note || t.category?.name || "Transaction"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t.recurrence_interval
                      ? INTERVAL_LABEL[t.recurrence_interval]
                      : ""}
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

        {/* Upcoming timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <CalendarClock className="h-4 w-4" /> Upcoming occurrences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {view.upcoming.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nothing scheduled in this window.
              </p>
            )}
            {view.upcoming.map(({ transaction: t, date }, i) => (
              <div
                key={`${t.id}-${i}`}
                className="flex items-center justify-between text-sm"
              >
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
