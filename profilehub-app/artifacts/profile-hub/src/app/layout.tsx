import type { Metadata } from "next";
import { ClientProviders } from "@/components/ClientProviders";
import { getDirection } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import "../index.css";

export const metadata: Metadata = {
  title: "ProfileHub",
  description: "Create and publish a professional profile hub.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Resolved on the server so lang/dir are correct on first paint, with no
  // flash of the wrong direction before hydration.
  const locale = await getLocale();

  return (
    <html lang={locale} dir={getDirection(locale)} suppressHydrationWarning>
      <body>
        <ClientProviders locale={locale}>{children}</ClientProviders>
      </body>
    </html>
  );
}
