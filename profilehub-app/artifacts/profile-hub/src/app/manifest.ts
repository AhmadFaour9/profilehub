import type { MetadataRoute } from "next";

import { getAppUrl } from "@/lib/env";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ProfileHub",
    short_name: "ProfileHub",
    description:
      "ProfileHub helps professionals, creators, and founders build a polished digital profile and personal brand hub.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1120",
    theme_color: "#0f172a",
    orientation: "portrait",
    categories: ["business", "productivity", "utilities"],
    lang: "en",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    scope: "/",
    id: "/",
  };
}
