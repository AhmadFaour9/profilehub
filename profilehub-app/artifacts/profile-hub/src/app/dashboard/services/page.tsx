export const dynamic = "force-dynamic";
import ServicesManager from "@/views/dashboard/ServicesManager";
import { getMyProfileContent } from "@/lib/profile-data";
import { redirect } from "next/navigation";

export default async function DashboardServicesPage() {
  const content = await getMyProfileContent();
  if (!content) return <div className="p-8 text-red-500">Error: Could not load profile content (User session may have dropped during navigation). Please do a hard refresh (Ctrl+F5).</div>;
  return <ServicesManager services={content.services} />;
}


