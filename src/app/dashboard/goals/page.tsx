import { getGoals } from "@/lib/data";
import { GoalsView } from "@/components/goals-view";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const goals = await getGoals();
  return <GoalsView goals={goals} />;
}
