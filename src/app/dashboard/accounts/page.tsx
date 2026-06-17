import { getAccounts } from "@/lib/data";
import { AccountsView } from "@/components/accounts-view";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const accounts = await getAccounts();
  return <AccountsView accounts={accounts} />;
}
