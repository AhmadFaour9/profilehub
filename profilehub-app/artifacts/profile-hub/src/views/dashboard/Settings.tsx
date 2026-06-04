"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { changeAccountPassword, updateAccountEmail } from "@/app/dashboard/settings/actions";

function passwordMeetsMinimum(value: string) {
  return value.length >= 8 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /[0-9]/.test(value);
}

export default function Settings({ currentEmail = "" }: { currentEmail?: string }) {
  const { toast } = useToast();
  const [displayEmail, setDisplayEmail] = useState(currentEmail);
  const [newEmail, setNewEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

    if (newPassword !== confirmPassword) {
      const message = "Passwords must match.";
      setPasswordStatus(message);
      toast({ title: "Password update failed", description: message, variant: "destructive" });
      return;
    }

    if (!passwordMeetsMinimum(newPassword)) {
      const message = "Use at least 8 characters with uppercase, lowercase, and a number.";
      setPasswordStatus(message);
      toast({ title: "Password update failed", description: message, variant: "destructive" });
      return;
    }

    setPasswordSaving(true);
    const result = await changeAccountPassword({ password: newPassword, confirmPassword });
    setPasswordSaving(false);

    if (!result.ok) {
      const message = result.message || "Could not update password.";
      setPasswordStatus(message);
      toast({ title: "Password update failed", description: message, variant: "destructive" });
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    const message = result.message || "Password updated successfully.";
    setPasswordStatus(message);
    toast({ title: "Password updated", description: message });
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-serif">Account Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account credentials and preferences.</p>
      </div>

      <form onSubmit={submitEmail} className="space-y-6 p-6 border rounded-xl bg-card">
        <h2 className="text-xl font-medium">Email Address</h2>
        <div className="space-y-2">
          <Label htmlFor="current-email">Current Email</Label>
          <Input id="current-email" value={displayEmail} disabled className="max-w-md" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-email">New Email</Label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              id="new-email"
              type="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              placeholder="Enter new email"
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
        <h2 className="text-xl font-medium">Change Password</h2>
        <div className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
            <p className="text-xs text-muted-foreground">Use at least 8 characters with uppercase, lowercase, and a number.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          <Button type="submit" variant="outline" disabled={passwordSaving || !newPassword || !confirmPassword}>
            {passwordSaving ? "Changing..." : "Change Password"}
          </Button>
          {passwordStatus && <p className="text-sm text-muted-foreground">{passwordStatus}</p>}
        </div>
      </form>

      <div className="space-y-6 p-6 border border-destructive/20 rounded-xl bg-destructive/5">
        <h2 className="text-xl font-medium text-destructive">Danger Zone</h2>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Delete Account</h3>
            <p className="text-sm text-muted-foreground">Permanently delete your account and all data.</p>
          </div>
          <Button variant="destructive">Delete Account</Button>
        </div>
      </div>
    </div>
  );
}
