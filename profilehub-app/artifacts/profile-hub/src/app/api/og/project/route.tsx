import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

/**
 * Generated cover art for a project that has no repository screenshot.
 *
 * A project without an image renders as an empty grey block, which reads as
 * unfinished. Inventing a screenshot would misrepresent the work, so this draws
 * an honest title card instead: the project name, its stack, and a colour
 * derived from the title so every project is visually distinct but stable
 * across renders.
 */
const PALETTES = [
  ["#0f172a", "#1e3a5f", "#38bdf8"],
  ["#111827", "#164e3f", "#34d399"],
  ["#1a1033", "#3b1f6e", "#a78bfa"],
  ["#1c1917", "#7c2d12", "#fb923c"],
  ["#0c1b2a", "#0e4a5f", "#22d3ee"],
  ["#1a1424", "#4c1d5f", "#e879f9"],
];

function paletteFor(seed: string): string[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return PALETTES[hash % PALETTES.length];
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const title = (params.get("title") || "Project").slice(0, 80);
  const subtitle = (params.get("subtitle") || "").slice(0, 90);

  const [from, via, accent] = paletteFor(title);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          background: `linear-gradient(135deg, ${from} 0%, ${via} 100%)`,
          fontFamily: "sans-serif",
        }}
      >
        {/* Accent rule doubles as the only decoration, keeping the card calm. */}
        <div style={{ display: "flex", width: 96, height: 8, background: accent, borderRadius: 4 }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "flex",
              fontSize: title.length > 44 ? 52 : 64,
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </div>

          {subtitle ? (
            <div style={{ display: "flex", fontSize: 28, color: accent, letterSpacing: "0.01em" }}>
              {subtitle}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", fontSize: 22, color: "rgba(255,255,255,0.55)" }}>
          Ahmad Faour
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
