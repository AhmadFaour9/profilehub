"use client";

import { useEffect } from "react";

export function PageViewBeacon({ profileId }: { profileId: string }) {
  useEffect(() => {
    const body = JSON.stringify({ profileId });

    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics/page-view", new Blob([body], { type: "application/json" }));
      return;
    }

    fetch("/api/analytics/page-view", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => undefined);
  }, [profileId]);

  return null;
}
