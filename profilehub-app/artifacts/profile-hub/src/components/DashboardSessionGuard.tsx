"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/modules/auth/client";

export function DashboardSessionGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let active = true;

    supabase.auth.getSession().then((result: any) => {
      if (!active) return;

      if (!result.data.session) {
        window.location.href = `/login?next=${encodeURIComponent(pathname || "/dashboard")}`;
        return;
      }

      setChecked(true);
      router.refresh();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: string, session: unknown) => {
      if (event === "SIGNED_OUT" || !session) {
        window.location.href = `/login?next=${encodeURIComponent(pathname || "/dashboard")}`;
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (!checked) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Loading dashboard...
      </div>
    );
  }

  return <>{children}</>;
}
