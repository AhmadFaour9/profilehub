import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isSafeRedirectPath } from "@/modules/shared";

type StatusSearchParams = {
  status?: string;
  type?: string;
  next?: string;
};

function statusCopy(status: string, type: string) {
  if (status === "success" && type === "email_confirm") {
    return {
      tone: "success" as const,
      title: "Account confirmed successfully",
      message: "Your email is verified. You can now continue setting up and managing your ProfileHub profile.",
      primaryLabel: "Continue",
      primaryHref: "/dashboard",
      secondaryLabel: "Go to login",
      secondaryHref: "/login",
    };
  }

  if (status === "success" && type === "password_recovery") {
    return {
      tone: "success" as const,
      title: "Password reset link verified",
      message: "Your secure password reset link is valid. Continue to choose a new password.",
      primaryLabel: "Set new password",
      primaryHref: "/auth/update-password",
      secondaryLabel: "Go to login",
      secondaryHref: "/login",
    };
  }

  if (status === "success" && type === "password_updated") {
    return {
      tone: "success" as const,
      title: "Password updated successfully",
      message: "Your ProfileHub password has been changed. Use the new password the next time you sign in.",
      primaryLabel: "Go to dashboard",
      primaryHref: "/dashboard",
      secondaryLabel: "Go to login",
      secondaryHref: "/login",
    };
  }

  if (status === "success" && type === "email_updated") {
    return {
      tone: "success" as const,
      title: "Email updated successfully",
      message: "Your new email address has been confirmed and is now attached to your ProfileHub account.",
      primaryLabel: "Go to settings",
      primaryHref: "/dashboard/settings",
      secondaryLabel: "Go to dashboard",
      secondaryHref: "/dashboard",
    };
  }

  if (type === "expired") {
    return {
      tone: "error" as const,
      title: "Invalid or expired link",
      message: "This verification link is no longer valid. Request a new link and try again.",
      primaryLabel: "Request password reset",
      primaryHref: "/forgot-password",
      secondaryLabel: "Go to login",
      secondaryHref: "/login",
    };
  }

  if (type === "oauth_failed") {
    return {
      tone: "error" as const,
      title: "Google sign-in failed",
      message: "We could not complete Google sign-in. Try again, or use email and password if your account already exists.",
      primaryLabel: "Try Google again",
      primaryHref: "/auth/google",
      secondaryLabel: "Go to login",
      secondaryHref: "/login",
    };
  }

  return {
    tone: "error" as const,
    title: "Something went wrong",
    message: "We could not complete this authentication step. Please try again or request a new link.",
    primaryLabel: "Go to login",
    primaryHref: "/login",
    secondaryLabel: "Request password reset",
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
            <CardTitle className="mt-2 text-2xl font-serif">{copy.title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <p className="text-sm leading-6 text-muted-foreground">{copy.message}</p>
          <div className="space-y-3">
            <Button className="w-full" asChild>
              <Link href={primaryHref}>{copy.primaryLabel}</Link>
            </Button>
            <Button className="w-full" variant="outline" asChild>
              <Link href={copy.secondaryHref}>{copy.secondaryLabel}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
