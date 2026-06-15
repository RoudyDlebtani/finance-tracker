import { getCategories, getTransactions } from "@/lib/data";
import { TransactionsView } from "@/components/transactions-view";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const [transactions, categories] = await Promise.all([
    getTransactions(),
    getCategories(),
  ]);

  return <TransactionsView transactions={transactions} categories={categories} />;
}
