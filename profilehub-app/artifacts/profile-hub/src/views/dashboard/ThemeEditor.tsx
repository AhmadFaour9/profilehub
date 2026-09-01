"use client";

import { useLocale } from "@/lib/i18n/client";

import { useState } from "react";
import { ThemePicker } from "@/components/dashboard/ThemePicker";
import { MobilePreview } from "@/components/dashboard/MobilePreview";
import type { Profile, ProfileTheme, Link, Project, Service, GalleryItem } from "@/modules/shared";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { updateTheme } from "@/app/dashboard/actions";

export default function ThemeEditor({ content }: { content: { profile: Profile, links: Link[], projects: Project[], services: Service[], media: GalleryItem[] } }) {
  const { t } = useLocale();
  const profile = content.profile;
  const [theme, setTheme] = useState<ProfileTheme>(profile.theme || { id: "default" });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateTheme({
        primaryColor: theme.primaryColor,
        backgroundColor: theme.backgroundColor,
        fontFamily: theme.fontFamily,
        buttonStyle: theme.buttonStyle,
        layout: theme.layout,
      });

      if (result.ok) {
        toast({ title: t("theme.saved"), description: t("theme.subtitle") });
      } else {
        toast({ title: t("status.error"), description: result.message || t("theme.saveFailed"), variant: "destructive" });
      }
    } catch {
      toast({ title: t("status.error"), description: t("theme.saveFailed"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex gap-12 max-w-6xl">
      <div className="flex-1 space-y-8">
        <div>
          <h1 className="text-3xl font-serif">{t("theme.title")}</h1>
          <p className="text-muted-foreground">{t("theme.subtitle")}</p>
        </div>

        <ThemePicker value={theme} onChange={setTheme} />

        <div className="pt-6 border-t">
          <Button onClick={handleSave} disabled={saving} data-testid="btn-save-theme">
            {saving ? t("action.saving") : t("theme.save")}
          </Button>
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
