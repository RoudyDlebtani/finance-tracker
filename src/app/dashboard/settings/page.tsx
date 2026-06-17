import { getProfile, getUser } from "@/lib/data";
import { SettingsView } from "@/components/settings-view";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [profile, user] = await Promise.all([getProfile(), getUser()]);
  return <SettingsView profile={profile} email={user?.email ?? ""} />;
}
