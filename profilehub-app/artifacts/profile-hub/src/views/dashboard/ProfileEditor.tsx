"use client";

import { useLocale } from "@/lib/i18n/client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { usePathname, useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Profile, Link, Project, Service, GalleryItem } from "@/modules/shared";
import { MobilePreview } from "@/components/dashboard/MobilePreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/image-upload";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateProfile } from "@/app/dashboard/actions";
import { usernameSchema } from "@/modules/shared";
import { buildProfileUrl, encodeProfileUsername, getClientAppUrl } from "@/lib/profile-url";

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
  const { t } = useLocale();
  const profile = content.profile;
  const { toast } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [appBaseUrl, setAppBaseUrl] = useState("");

  useEffect(() => {
    setAppBaseUrl(getClientAppUrl());
  }, []);
  
  const getPublicUrl = (username: string) => {
    const safeUsername = username.trim();
    if (!safeUsername) return "";
    return appBaseUrl ? buildProfileUrl(appBaseUrl, safeUsername) : `/${encodeProfileUsername(safeUsername)}`;
  };

  const handleCopyUrl = () => {
    const url = getPublicUrl(form.getValues("username"));
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
    const profileIsComplete = Boolean(
      values.displayName.trim() &&
        values.username.trim() &&
        values.profession?.trim() &&
        values.bio?.trim()
    );
    const result = await updateProfile({
      displayName: values.displayName,
      username: values.username,
      title: values.profession || "",
      bio: values.bio || "",
      location: values.location || "",
      website: values.website || "",
      avatarUrl: values.avatarUrl || "",
      coverUrl: values.coverUrl || "",
      isPublished: true,
    });

    toast({
      title: result.ok ? "Profile updated" : "Profile update failed",
      description: result.message || "Your profile information has been saved successfully.",
      variant: result.ok ? "default" : "destructive",
    });

    if (result.ok && pathname === "/onboarding" && profileIsComplete) {
      router.push("/dashboard");
    }
  }

  return (
    <div className="flex gap-12 max-w-6xl">
      <div className="flex-1 space-y-8">
        <div>
          <h1 className="text-3xl font-serif">{t("profile.edit")}</h1>
          <p className="text-muted-foreground">{t("profile.subtitle")}</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("profile.displayName")}</FormLabel>
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
                    <FormLabel>{t("profile.username")}</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-username" />
                    </FormControl>
                    <FormDescription className="flex items-center gap-2">
                      <span>{getPublicUrl(field.value)}</span>
                      {field.value && (
                        <button
                          type="button"
                          onClick={handleCopyUrl}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title={t("profile.copyUrl")}
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
                  <FormLabel>{t("profile.profession")}</FormLabel>
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
                      placeholder={t("profile.bioPlaceholder")} 
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
                    <FormLabel>{t("profile.location")}</FormLabel>
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
                    <FormLabel>{t("profile.personalWebsite")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://" data-testid="input-website" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-8 md:grid-cols-[auto_1fr] md:items-start">
              <FormField
                control={form.control}
                name="avatarUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <ImageUpload
                        bucket="avatars"
                        variant="avatar"
                        label={t("profile.avatar")}
                        value={field.value}
                        onChange={(url) => form.setValue("avatarUrl", url, { shouldDirty: true })}
                      />
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
                    <FormControl>
                      <ImageUpload
                        bucket="covers"
                        variant="cover"
                        label={t("profile.cover")}
                        value={field.value}
                        onChange={(url) => form.setValue("coverUrl", url, { shouldDirty: true })}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" data-testid="btn-save-profile">{t("action.save")}</Button>
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
          socialLinks: profile.socialLinks,
        }} 
        links={content.links}
        projects={content.projects}
        services={content.services}
        gallery={content.media}
      />
    </div>
  );
}
