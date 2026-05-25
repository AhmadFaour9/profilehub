import ServicesManager from "@/views/dashboard/ServicesManager";
import { getMyProfileContent } from "@/lib/profile-data";

export default async function DashboardServicesPage() {
  const content = await getMyProfileContent();
  return <ServicesManager services={content?.services} />;
}
