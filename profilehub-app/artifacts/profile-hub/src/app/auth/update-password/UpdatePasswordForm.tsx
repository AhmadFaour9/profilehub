"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { updateRecoveredPassword } from "./actions";

function passwordMeetsMinimum(value: string) {
  return value.length >= 8 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /[0-9]/.test(value);
}

export function UpdatePasswordForm({ email }: { email?: string | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (password !== confirmPassword) {
      const nextMessage = "Passwords must match.";
      setMessage(nextMessage);
      toast({ title: "Password update failed", description: nextMessage, variant: "destructive" });
      return;
    }

    if (!passwordMeetsMinimum(password)) {
      const nextMessage = "Use at least 8 characters with uppercase, lowercase, and a number.";
      setMessage(nextMessage);
      toast({ title: "Password update failed", description: nextMessage, variant: "destructive" });
      return;
    }

    setSaving(true);
    const result = await updateRecoveredPassword({ password, confirmPassword });
    setSaving(false);

    if (!result.ok) {
      const nextMessage = result.message || "Could not update password.";
      setMessage(nextMessage);
      toast({ title: "Password update failed", description: nextMessage, variant: "destructive" });
      return;
    }

    setPassword("");
    setConfirmPassword("");
    toast({ title: "Password updated", description: result.message || "Password updated successfully." });
    router.push("/auth/status?status=success&type=password_updated");
  }

  return (
    <form onSubmit={submitPassword} className="space-y-5">
      {email && (
        <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Updating password for <span className="font-medium text-foreground">{email}</span>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          required
        />
        <p className="text-xs text-muted-foreground">Use at least 8 characters with uppercase, lowercase, and a number.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm new password</Label>
        <Input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
          required
        />
      </div>
      {message && <p className="text-sm text-destructive">{message}</p>}
      <Button type="submit" className="w-full" disabled={saving || !password || !confirmPassword}>
        {saving ? "Updating..." : "Update password"}
      </Button>
    </form>
  );
}
