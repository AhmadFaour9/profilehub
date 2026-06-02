export const dynamic = "force-dynamic";
import ServicesManager from "@/views/dashboard/ServicesManager";
import { requireMyProfileContent } from "@/lib/profile-data";

export default async function DashboardServicesPage() {
  const content = await requireMyProfileContent("/dashboard/services");
  return <ServicesManager services={content.services} />;
}


