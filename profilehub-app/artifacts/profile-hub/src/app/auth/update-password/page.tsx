import Link from "next/link";
import { redirect } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthenticatedUser } from "@/modules/auth";
import { UpdatePasswordForm } from "./UpdatePasswordForm";

export const dynamic = "force-dynamic";

export default async function UpdatePasswordPage() {
  const { user } = await getAuthenticatedUser("generic");

  if (!user) {
    redirect("/auth/status?status=error&type=expired");
  }

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-10 flex items-center justify-center">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">ProfileHub</p>
            <CardTitle className="mt-2 text-2xl font-serif">Create a new password</CardTitle>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            Your password reset link was verified. Choose a new password to secure your account.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <UpdatePasswordForm email={user.email} />
          <Button className="w-full" variant="outline" asChild>
            <Link href="/login">Back to login</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
