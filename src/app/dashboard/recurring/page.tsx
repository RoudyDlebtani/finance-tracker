import { getTransactions } from "@/lib/data";
import { RecurringView } from "@/components/recurring-view";

export const dynamic = "force-dynamic";

export default async function RecurringPage() {
  const transactions = await getTransactions();
  return <RecurringView transactions={transactions} />;
}
