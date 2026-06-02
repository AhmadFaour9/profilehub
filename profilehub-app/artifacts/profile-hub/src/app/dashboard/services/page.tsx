export const dynamic = "force-dynamic";
import ServicesManager from "@/views/dashboard/ServicesManager";
import { getMyProfileContent } from "@/lib/profile-data";
import { DashboardDataPending } from "@/components/dashboard/DashboardDataPending";

export default async function DashboardServicesPage() {
  const content = await getMyProfileContent();
  if (!content) return <DashboardDataPending />;
  return <ServicesManager services={content.services} />;
}


