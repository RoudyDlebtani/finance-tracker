import { getTransactions } from "@/lib/data";
import { DashboardOverview } from "@/components/dashboard-overview";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const transactions = await getTransactions();
  return <DashboardOverview transactions={transactions} />;
}
