"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { mockUser } from "@/lib/mock-data";
import type { Profile } from "@/modules/shared";
import { MobilePreview } from "@/components/dashboard/MobilePreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { updateProfile } from "@/app/auth/actions";
import { usernameSchema } from "@/modules/shared";

const profileSchema = z.object({
  displayName: z.string().min(2),
  username: usernameSchema,
  profession: z.string().optional(),
  bio: z.string().max(500).optional(),
  location: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
});

export default function ProfileEditor({ profile = mockUser }: { profile?: Profile }) {
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: profile.displayName,
      username: profile.username,
      profession: profile.title || profile.profession || "",
      bio: profile.bio || "",
      location: profile.location || "",
      website: profile.website || "",
    },
  });

  async function onSubmit(values: z.infer<typeof profileSchema>) {
    const result = await updateProfile({
      displayName: values.displayName,
      username: values.username,
      title: values.profession || "",
      bio: values.bio || "",
      location: values.location || "",
      website: values.website || "",
      isPublished: profile.isPublished,
    });

    toast({
      title: result.ok ? "Profile updated" : "Profile update failed",
      description: result.message || "Your profile information has been saved successfully.",
      variant: result.ok ? "default" : "destructive",
    });
  }

  return (
    <div className="flex gap-12 max-w-6xl">
      <div className="flex-1 space-y-8">
        <div>
          <h1 className="text-3xl font-serif">Profile Information</h1>
          <p className="text-muted-foreground">Update your public profile details.</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-display-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-username" />
                    </FormControl>
                    <FormDescription>profilehub.app/{field.value}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="profession"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profession</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Senior Product Designer" data-testid="input-profession" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Tell us about yourself..." 
                      className="resize-none" 
                      rows={4}
                      data-testid="input-bio" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Dubai, UAE" data-testid="input-location" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Personal Website</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://" data-testid="input-website" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" data-testid="btn-save-profile">Save Changes</Button>
          </form>
        </Form>
      </div>
      
      <MobilePreview username={form.watch("username")} />
    </div>
  );
}
