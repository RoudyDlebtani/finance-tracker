import { getTransactions, getBudgets } from "@/lib/data";
import { buildInsights } from "@/lib/finance";
import { InsightsView } from "@/components/insights-view";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const [transactions, budgets] = await Promise.all([
    getTransactions(),
    getBudgets(),
  ]);
  return <InsightsView insights={buildInsights(transactions, budgets)} />;
}
