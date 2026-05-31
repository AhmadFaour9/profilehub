import ServicesManager from "@/views/dashboard/ServicesManager";
import { getMyProfileContent } from "@/lib/profile-data";
import { redirect } from "next/navigation";

export default async function DashboardServicesPage() {
  const content = await getMyProfileContent();
  if (!content) redirect("/login");
  return <ServicesManager services={content.services} />;
}
