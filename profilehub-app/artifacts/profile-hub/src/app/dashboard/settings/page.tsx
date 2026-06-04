export const dynamic = "force-dynamic";
import Settings from "@/views/dashboard/Settings";
import { getDashboardProfile } from "@/lib/profile-data";

export default async function DashboardSettingsPage() {
  const { user } = await getDashboardProfile();
  return <Settings currentEmail={user?.email || ""} />;
}


