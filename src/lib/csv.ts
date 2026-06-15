import type { TransactionWithCategory } from "./types";

/** Build a CSV string from transactions and trigger a browser download. */
export function downloadTransactionsCsv(transactions: TransactionWithCategory[]) {
  const header = ["Date", "Type", "Category", "Amount", "Note"];
  const rows = transactions.map((t) => [
    t.date,
    t.type,
    t.category?.name ?? "Uncategorized",
    String(t.amount),
    t.note ?? "",
  ]);

  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const csv = [header, ...rows]
    .map((row) => row.map(escape).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
