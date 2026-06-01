import Login from "@/views/Login";
import { isSafeRedirectPath } from "@/modules/shared";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const nextPath = isSafeRedirectPath(params.next) ? params.next : "/dashboard";

  return <Login nextPath={nextPath} />;
}
