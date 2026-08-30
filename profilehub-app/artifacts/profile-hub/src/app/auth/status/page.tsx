import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isSafeRedirectPath } from "@/modules/shared";
import { getTranslations } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n";

type StatusSearchParams = {
  status?: string;
  type?: string;
  next?: string;
};

function statusCopy(status: string, type: string): {
  tone: "success" | "error";
  titleKey: MessageKey;
  messageKey: MessageKey;
  primaryKey: MessageKey;
  primaryHref: string;
  secondaryKey: MessageKey;
  secondaryHref: string;
} {
  if (status === "success" && type === "email_confirm") {
    return {
      tone: "success",
      titleKey: "authStatus.confirmTitle",
      messageKey: "authStatus.confirmMessage",
      primaryKey: "action.continue",
      primaryHref: "/dashboard",
      secondaryKey: "authStatus.goToLogin",
      secondaryHref: "/login",
    };
  }

  if (status === "success" && type === "password_recovery") {
    return {
      tone: "success",
      titleKey: "authStatus.recoveryTitle",
      messageKey: "authStatus.recoveryMessage",
      primaryKey: "action.continue",
      primaryHref: "/auth/update-password",
      secondaryKey: "authStatus.goToLogin",
      secondaryHref: "/login",
    };
  }

  if (status === "success" && type === "password_updated") {
    return {
      tone: "success",
      titleKey: "authStatus.updatedTitle",
      messageKey: "authStatus.updatedMessage",
      primaryKey: "auth.login",
      primaryHref: "/login",
      secondaryKey: "authStatus.goToLogin",
      secondaryHref: "/login",
    };
  }

  if (status === "success" && type === "email_updated") {
    return {
      tone: "success",
      titleKey: "authStatus.emailUpdatedTitle",
      messageKey: "authStatus.emailUpdatedMessage",
      primaryKey: "action.continue",
      primaryHref: "/dashboard/settings",
      secondaryKey: "authStatus.goToLogin",
      secondaryHref: "/login",
    };
  }

  if (type === "expired") {
    return {
      tone: "error",
      titleKey: "authStatus.expiredTitle",
      messageKey: "authStatus.expiredMessage",
      primaryKey: "authStatus.requestReset",
      primaryHref: "/forgot-password",
      secondaryKey: "authStatus.goToLogin",
      secondaryHref: "/login",
    };
  }

  if (type === "oauth_failed") {
    return {
      tone: "error",
      titleKey: "authStatus.oauthFailedTitle",
      messageKey: "authStatus.oauthFailedMessage",
      primaryKey: "auth.login",
      primaryHref: "/login",
      secondaryKey: "authStatus.requestReset",
      secondaryHref: "/forgot-password",
    };
  }

  return {
    tone: "error",
    titleKey: "authStatus.unknownTitle",
    messageKey: "authStatus.unknownMessage",
    primaryKey: "authStatus.goToLogin",
    primaryHref: "/login",
    secondaryKey: "authStatus.requestReset",
    secondaryHref: "/forgot-password",
  };
}

export default async function AuthStatusPage({
  searchParams,
}: {
  searchParams?: Promise<StatusSearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const status = params.status === "success" ? "success" : "error";
  const type = params.type || "unknown";
  const copy = statusCopy(status, type);
  const { t } = await getTranslations();
  const primaryHref = isSafeRedirectPath(params.next) && copy.tone === "success" ? params.next! : copy.primaryHref;
  const Icon = copy.tone === "success" ? CheckCircle2 : AlertTriangle;

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-10 flex items-center justify-center">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">ProfileHub</p>
            <CardTitle className="mt-2 text-2xl font-serif">{t(copy.titleKey)}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <p className="text-sm leading-6 text-muted-foreground">{t(copy.messageKey)}</p>
          <div className="space-y-3">
            <Button className="w-full" asChild>
              <Link href={primaryHref}>{t(copy.primaryKey)}</Link>
            </Button>
            <Button className="w-full" variant="outline" asChild>
              <Link href={copy.secondaryHref}>{t(copy.secondaryKey)}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
