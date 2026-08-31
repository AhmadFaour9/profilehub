import type { MetadataRoute } from "next";

import { getAppUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const appUrl = getAppUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/auth/",
        "/account/",
        "/dashboard/",
        "/onboarding",
        "/login",
        "/register",
        "/test-auth",
      ],
    },
    sitemap: [`${appUrl}/sitemap.xml`],
  };
}
