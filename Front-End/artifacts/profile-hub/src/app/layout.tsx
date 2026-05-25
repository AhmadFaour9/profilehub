import type { Metadata } from "next";
import { ClientProviders } from "@/components/ClientProviders";
import "../index.css";

export const metadata: Metadata = {
  title: "ProfileHub",
  description: "Create and publish a professional profile hub.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
