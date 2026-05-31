"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Profile, Link, Project, Service, GalleryItem } from "@/modules/shared";
import { MobilePreview } from "@/components/dashboard/MobilePreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Copy, Check } from "lucide-react";
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
  avatarUrl: z.string().url().optional().or(z.literal("")),
  coverUrl: z.string().url().optional().or(z.literal("")),
});

export default function ProfileEditor({ content }: { content: { profile: Profile, links: Link[], projects: Project[], services: Service[], media: GalleryItem[] } }) {
  const profile = content.profile;
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  
  const handleCopyUrl = () => {
    const url = `${window.location.origin}/${form.getValues("username")}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ description: "Public URL copied to clipboard!" });
  };

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: profile.displayName,
      username: profile.username,
      profession: profile.title || profile.profession || "",
      bio: profile.bio || "",
      location: profile.location || "",
      website: profile.website || "",
      avatarUrl: profile.avatarUrl || "",
      coverUrl: profile.coverUrl || "",
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
      avatarUrl: values.avatarUrl || "",
      coverUrl: values.coverUrl || "",
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
                    <FormDescription className="flex items-center gap-2">
                      <span>profilehub.app/{field.value}</span>
                      {field.value && (
                        <button
                          type="button"
                          onClick={handleCopyUrl}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title="Copy Public URL"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </FormDescription>
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

            <div className="grid md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="avatarUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Avatar Image URL</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://..." data-testid="input-avatar-url" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="coverUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cover Image URL</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://..." data-testid="input-cover-url" />
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
      
      <MobilePreview 
        profile={{ 
          ...profile, 
          username: form.watch("username"),
          displayName: form.watch("displayName"),
          title: form.watch("profession") || profile.title,
          profession: form.watch("profession") || profile.profession,
          bio: form.watch("bio"),
          location: form.watch("location"),
          website: form.watch("website"),
          avatarUrl: form.watch("avatarUrl") || profile.avatarUrl,
          coverUrl: form.watch("coverUrl") || profile.coverUrl,
        }} 
        links={content.links}
        projects={content.projects}
        services={content.services}
        gallery={content.media}
      />
    </div>
  );
}
