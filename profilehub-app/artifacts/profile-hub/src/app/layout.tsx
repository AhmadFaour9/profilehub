import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { ClientProviders } from "@/components/ClientProviders";
import { getDirection } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { getAppUrl, isIndexableDeployment } from "@/lib/env";
import "../index.css";

const appUrl = getAppUrl();
const shouldIndex = isIndexableDeployment();

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  applicationName: "ProfileHub",
  title: {
    default: "ProfileHub | Professional Profile & Personal Brand Hub",
    template: "%s | ProfileHub",
  },
  description:
    "ProfileHub is a professional profile platform for founders, creators, and professionals to showcase work, services, projects, and contact details in one polished digital presence.",
  keywords: [
    "ProfileHub",
    "professional profile",
    "personal branding",
    "creator portfolio",
    "digital resume",
    "portfolio website",
    "business profile",
    "professional website",
  ],
  authors: [{ name: "ProfileHub" }],
  creator: "ProfileHub",
  publisher: "ProfileHub",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "ProfileHub",
    title: "ProfileHub | Professional Profile & Personal Brand Hub",
    description:
      "Showcase your work, services, links, and contact details through one elegant professional profile.",
    images: [
      {
        url: "/opengraph.jpg",
        width: 1280,
        height: 720,
        alt: "ProfileHub professional profile platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ProfileHub | Professional Profile & Personal Brand Hub",
    description:
      "Create a polished digital profile that turns attention into opportunities.",
    images: ["/opengraph.jpg"],
  },
  robots: {
    index: shouldIndex,
    follow: shouldIndex,
    googleBot: {
      index: shouldIndex,
      follow: shouldIndex,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
  },
};

export const viewport = {
  themeColor: "#0f172a",
  colorScheme: "dark light",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Resolved on the server so lang/dir are correct on first paint, with no
  // flash of the wrong direction before hydration.
  const locale = await getLocale();
  const appUrl = getAppUrl();

  return (
    <html
      lang={locale}
      dir={getDirection(locale)}
      suppressHydrationWarning
    >
      <head>
        {/* Preload critical resources for faster rendering */}
        <link rel="preload" as="image" href="/icon.png" />
        <link rel="dns-prefetch" href={appUrl} />
        {/* Preconnect to Supabase for faster database queries */}
        <link rel="preconnect" href="https://api.supabase.co" />
      </head>
      <body>
        <ClientProviders locale={locale}>{children}</ClientProviders>
        <Analytics />
      </body>
    </html>
  );
}
