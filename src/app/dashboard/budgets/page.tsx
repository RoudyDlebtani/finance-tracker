import { getBudgets, getCategories, getTransactions } from "@/lib/data";
import { BudgetsView } from "@/components/budgets-view";

export const dynamic = "force-dynamic";

export default async function BudgetsPage() {
  const [budgets, categories, transactions] = await Promise.all([
    getBudgets(),
    getCategories(),
    getTransactions(),
  ]);
  return (
    <BudgetsView
      budgets={budgets}
      categories={categories}
      transactions={transactions}
    />
  );
}
