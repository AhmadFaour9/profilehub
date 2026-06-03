"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
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
  linkedin: z.string().optional().or(z.literal("")),
  github: z.string().optional().or(z.literal("")),
  portfolio: z.string().optional().or(z.literal("")),
  twitter: z.string().optional().or(z.literal("")),
  instagram: z.string().optional().or(z.literal("")),
  youtube: z.string().optional().or(z.literal("")),
  behance: z.string().optional().or(z.literal("")),
  dribbble: z.string().optional().or(z.literal("")),
  tiktok: z.string().optional().or(z.literal("")),
  facebook: z.string().optional().or(z.literal("")),
  whatsapp: z.string().optional().or(z.literal("")),
  email: z.string().optional().or(z.literal("")),
});

const SOCIAL_PLATFORMS = [
  { id: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/..." },
  { id: "github", label: "GitHub", placeholder: "https://github.com/..." },
  { id: "portfolio", label: "Portfolio", placeholder: "https://..." },
  { id: "twitter", label: "X / Twitter", placeholder: "https://twitter.com/..." },
  { id: "instagram", label: "Instagram", placeholder: "https://instagram.com/..." },
  { id: "youtube", label: "YouTube", placeholder: "https://youtube.com/@..." },
  { id: "behance", label: "Behance", placeholder: "https://behance.net/..." },
  { id: "dribbble", label: "Dribbble", placeholder: "https://dribbble.com/..." },
  { id: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@..." },
  { id: "facebook", label: "Facebook", placeholder: "https://facebook.com/..." },
  { id: "whatsapp", label: "WhatsApp", placeholder: "https://wa.me/..." },
  { id: "email", label: "Email Contact", placeholder: "mailto:..." },
];

export default function ProfileEditor({ content }: { content: { profile: Profile, links: Link[], projects: Project[], services: Service[], media: GalleryItem[] } }) {
  const profile = content.profile;
  const { toast } = useToast();
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

  const getSocial = (platform: string) => profile.socialLinks?.find(l => l.platform === platform)?.url || "";

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
      linkedin: getSocial("linkedin"),
      github: getSocial("github"),
      portfolio: getSocial("portfolio"),
      twitter: getSocial("twitter"),
      instagram: getSocial("instagram"),
      youtube: getSocial("youtube"),
      behance: getSocial("behance"),
      dribbble: getSocial("dribbble"),
      tiktok: getSocial("tiktok"),
      facebook: getSocial("facebook"),
      whatsapp: getSocial("whatsapp"),
      email: getSocial("email"),
    },
  });

  async function onSubmit(values: z.infer<typeof profileSchema>) {
    const socialLinks = SOCIAL_PLATFORMS
      .map(p => ({ platform: p.id, url: values[p.id as keyof typeof values] as string }))
      .filter(l => Boolean(l.url));

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
      socialLinks,
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
                      <span>{getPublicUrl(field.value)}</span>
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

            <div className="grid md:grid-cols-2 gap-6 items-start">
              <FormField
                control={form.control}
                name="avatarUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <ImageUpload
                        bucket="avatars"
                        variant="avatar"
                        label="Profile Photo"
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
                        label="Cover Image"
                        value={field.value}
                        onChange={(url) => form.setValue("coverUrl", url, { shouldDirty: true })}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="pt-6 border-t">
              <h3 className="text-lg font-medium mb-4">Social Links</h3>
              <div className="grid md:grid-cols-2 gap-6">
                {SOCIAL_PLATFORMS.map((platform) => (
                  <FormField
                    key={platform.id}
                    control={form.control}
                    name={platform.id as keyof typeof profileSchema.shape}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{platform.label}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={platform.placeholder} data-testid={`input-${platform.id}`} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
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
          socialLinks: SOCIAL_PLATFORMS
            .map(p => ({ platform: p.id, url: form.watch(p.id as keyof typeof profileSchema.shape) as string }))
            .filter(l => Boolean(l.url)),
        }} 
        links={content.links}
        projects={content.projects}
        services={content.services}
        gallery={content.media}
      />
    </div>
  );
}
