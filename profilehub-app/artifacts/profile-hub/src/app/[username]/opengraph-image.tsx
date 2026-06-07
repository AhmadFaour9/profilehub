import { ImageResponse } from "next/og";
import { getPublicProfileCached } from "@/lib/profile-data";

export const runtime = "nodejs";
export const alt = "ProfileHub profile preview";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getPublicProfileCached(username);
  const displayName = profile?.displayName || "ProfileHub";
  const title = profile?.title || profile?.profession || "Professional profile";
  const bio = profile?.bio || "Smart links, projects, services, and portfolio in one public profile.";
  const initial = displayName.trim().charAt(0).toUpperCase() || "P";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0f172a",
          color: "#ffffff",
          padding: "64px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px", color: "#cbd5e1", fontSize: 28 }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#16a34a",
              color: "#ffffff",
              fontWeight: 800,
            }}
          >
            PH
          </div>
          <span>ProfileHub</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "42px" }}>
          <div
            style={{
              width: 180,
              height: 180,
              borderRadius: 42,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#f8fafc",
              color: "#0f172a",
              fontSize: 92,
              fontWeight: 800,
            }}
          >
            {initial}
          </div>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 780 }}>
            <h1 style={{ margin: 0, fontSize: 74, lineHeight: 1.02, letterSpacing: -2, fontWeight: 800 }}>
              {displayName}
            </h1>
            <p style={{ margin: "20px 0 0", fontSize: 34, color: "#bbf7d0", fontWeight: 700 }}>{title}</p>
            <p style={{ margin: "24px 0 0", fontSize: 28, lineHeight: 1.35, color: "#cbd5e1" }}>{bio.slice(0, 150)}</p>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8", fontSize: 25 }}>
          <span>{profile?.username ? `profilehub-two.vercel.app/${profile.username}` : "profilehub-two.vercel.app"}</span>
          <span>Smart links · Projects · Services</span>
        </div>
      </div>
    ),
    size
  );
}
