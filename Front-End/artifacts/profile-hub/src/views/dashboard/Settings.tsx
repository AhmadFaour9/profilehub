"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Settings() {
  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-serif">Account Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account credentials and preferences.</p>
      </div>

      <div className="space-y-6 p-6 border rounded-xl bg-card">
        <h2 className="text-xl font-medium">Email Address</h2>
        <div className="space-y-2">
          <Label>Current Email</Label>
          <div className="flex gap-4">
            <Input defaultValue="hello@saraalhassan.design" disabled className="max-w-md" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>New Email</Label>
          <div className="flex gap-4">
            <Input placeholder="Enter new email" className="max-w-md" />
            <Button variant="outline">Update Email</Button>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6 border rounded-xl bg-card">
        <h2 className="text-xl font-medium">Change Password</h2>
        <div className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label>Current Password</Label>
            <Input type="password" />
          </div>
          <div className="space-y-2">
            <Label>New Password</Label>
            <Input type="password" />
          </div>
          <Button variant="outline">Change Password</Button>
        </div>
      </div>

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
