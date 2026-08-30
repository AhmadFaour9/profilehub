"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { AuthHashHandler } from "@/components/AuthHashHandler";
import { GlobalLanguageToggle } from "@/components/LanguageToggle";
import { LocaleProvider } from "@/lib/i18n/client";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n";

export function ClientProviders({
  children,
  locale = DEFAULT_LOCALE,
}: {
  children: React.ReactNode;
  locale?: Locale;
}) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider initialLocale={locale}>
        <ThemeProvider>
          <TooltipProvider>
            <AuthHashHandler />
            <GlobalLanguageToggle />
            {children}
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </LocaleProvider>
    </QueryClientProvider>
  );
}
