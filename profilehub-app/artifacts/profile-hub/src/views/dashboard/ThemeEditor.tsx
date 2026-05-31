"use client";

import { useState } from "react";
import { ThemePicker } from "@/components/dashboard/ThemePicker";
import { MobilePreview } from "@/components/dashboard/MobilePreview";
import type { Profile, ProfileTheme, Link, Project, Service, GalleryItem } from "@/modules/shared";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function ThemeEditor({ content }: { content: { profile: Profile, links: Link[], projects: Project[], services: Service[], media: GalleryItem[] } }) {
  const profile = content.profile;
  const [theme, setTheme] = useState<ProfileTheme>(profile.theme || { id: "default" });
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Theme saved",
      description: "Your profile appearance has been updated."
    });
  };

  return (
    <div className="flex gap-12 max-w-6xl">
      <div className="flex-1 space-y-8">
        <div>
          <h1 className="text-3xl font-serif">Appearance</h1>
          <p className="text-muted-foreground">Customize colors and button styles.</p>
        </div>

        <ThemePicker value={theme} onChange={setTheme} />

        <div className="pt-6 border-t">
          <Button onClick={handleSave} data-testid="btn-save-theme">Save Appearance</Button>
        </div>
      </div>
      
      <MobilePreview 
        profile={{ ...profile, theme }} 
        links={content.links}
        projects={content.projects}
        services={content.services}
        gallery={content.media}
      />
    </div>
  );
}
