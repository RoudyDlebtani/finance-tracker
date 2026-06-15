"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CategorySlice, MonthlyPoint } from "@/lib/finance";
import { formatCurrency } from "@/lib/utils";

const axisProps = {
  stroke: "var(--muted-foreground)",
  fontSize: 12,
  tickLine: false,
  axisLine: false,
};

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--card-foreground)",
  fontSize: 13,
};

export function IncomeExpenseChart({ data }: { data: MonthlyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="inc" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="month" {...axisProps} />
        <YAxis {...axisProps} width={60} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) => formatCurrency(Number(value))}
        />
        <Legend />
        <Area
          type="monotone"
          dataKey="income"
          name="Income"
          stroke="#22c55e"
          fill="url(#inc)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="expenses"
          name="Expenses"
          stroke="#ef4444"
          fill="url(#exp)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CategoryPieChart({ data }: { data: CategorySlice[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        No expenses in this period.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
        >
          {data.map((slice) => (
            <Cell key={slice.name} fill={slice.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) => formatCurrency(Number(value))}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function MonthlyBarChart({ data }: { data: MonthlyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="month" {...axisProps} />
        <YAxis {...axisProps} width={60} />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: "var(--muted)" }}
          formatter={(value) => formatCurrency(Number(value))}
        />
        <Legend />
        <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
