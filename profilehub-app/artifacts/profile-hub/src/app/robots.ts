import type { MetadataRoute } from "next";

import { getAppUrl, isIndexableDeployment } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const appUrl = getAppUrl();
  const isIndexable = isIndexableDeployment();

  return {
    // Let crawlers reach private HTML routes so their noindex header can be
    // read. A Disallow would prevent that and can still leave a bare URL in
    // search results when another site links to it.
    rules: isIndexable
      ? {
          userAgent: "*",
          allow: "/",
        }
      : {
          userAgent: "*",
          disallow: "/",
        },
    sitemap: [`${appUrl}/sitemap.xml`],
  };
}
