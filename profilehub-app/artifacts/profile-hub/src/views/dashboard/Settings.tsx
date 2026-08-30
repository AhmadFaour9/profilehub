"use client";

import { useLocale } from "@/lib/i18n/client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { sendAccountPasswordRecoveryEmail, updateAccountEmail } from "@/app/dashboard/settings/actions";

export default function Settings({ currentEmail = "" }: { currentEmail?: string }) {
  const { t } = useLocale();
  const { toast } = useToast();
  const [displayEmail, setDisplayEmail] = useState(currentEmail);
  const [newEmail, setNewEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailSaving(true);
    setEmailStatus("");

    const result = await updateAccountEmail({ email: newEmail });
    setEmailSaving(false);

    if (!result.ok) {
      const message = result.message || "Could not update email.";
      setEmailStatus(message);
      toast({ title: "Email update failed", description: message, variant: "destructive" });
      return;
    }

    if (!result.confirmationRequired && result.email) {
      setDisplayEmail(result.email);
      setNewEmail("");
    }

    const message = result.message || "Email updated successfully.";
    setEmailStatus(message);
    toast({ title: result.confirmationRequired ? "Confirm your new email" : "Email updated", description: message });
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordStatus("");
    setPasswordSaving(true);
    const result = await sendAccountPasswordRecoveryEmail();
    setPasswordSaving(false);

    if (!result.ok) {
      const message = result.message || "Could not send password change email.";
      setPasswordStatus(message);
      toast({ title: "Password email failed", description: message, variant: "destructive" });
      return;
    }

    const message = result.message || "We sent a secure password change link to your email.";
    setPasswordStatus(message);
    toast({ title: "Check your email", description: message });
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-serif">{t("settings.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("settings.subtitle")}</p>
      </div>

      <form onSubmit={submitEmail} className="space-y-6 p-6 border rounded-xl bg-card">
        <h2 className="text-xl font-medium">{t("settings.emailAddress")}</h2>
        <div className="space-y-2">
          <Label htmlFor="current-email">{t("settings.currentEmail")}</Label>
          <Input id="current-email" value={displayEmail} disabled className="max-w-md" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-email">{t("settings.newEmail")}</Label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              id="new-email"
              type="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              placeholder={t("settings.newEmailPlaceholder")}
              className="max-w-md"
              autoComplete="email"
              required
            />
            <Button type="submit" variant="outline" disabled={emailSaving || !newEmail.trim()}>
              {emailSaving ? "Updating..." : "Update Email"}
            </Button>
          </div>
          {emailStatus && <p className="text-sm text-muted-foreground">{emailStatus}</p>}
        </div>
      </form>

      <form onSubmit={submitPassword} className="space-y-6 p-6 border rounded-xl bg-card">
        <h2 className="text-xl font-medium">{t("settings.changePassword")}</h2>
        <div className="space-y-4 max-w-md">
          <p className="text-sm text-muted-foreground">
            We will send a secure password change link to your account email. After confirming the link, you can set a new password.
          </p>
          <Button type="submit" variant="outline" disabled={passwordSaving || !displayEmail}>
            {passwordSaving ? "Sending..." : "Send password reset email"}
          </Button>
          {passwordStatus && <p className="text-sm text-muted-foreground">{passwordStatus}</p>}
        </div>
      </form>

      <div className="space-y-6 p-6 border border-destructive/20 rounded-xl bg-destructive/5">
        <h2 className="text-xl font-medium text-destructive">{t("settings.dangerZone")}</h2>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">{t("settings.deleteAccount")}</h3>
            <p className="text-sm text-muted-foreground">{t("settings.deleteAccountHint")}</p>
          </div>
          <Button variant="destructive">{t("settings.deleteAccount")}</Button>
        </div>
      </div>
    </div>
  );
}
