"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useLocale } from "@/lib/i18n/client";

export default function NotFound() {
  const { t } = useLocale();
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-destructive/10 p-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-semibold text-foreground">{t("public.notFoundTitle")}</h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("notFound.body")}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/">{t("notFound.goHome")}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/login">{t("auth.login")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
