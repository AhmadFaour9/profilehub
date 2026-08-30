"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { updateSectionVisibility } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/lib/i18n/client";
import {
  DEFAULT_SECTION_VISIBILITY,
  SECTION_GROUPS,
  SECTION_LABEL_KEYS,
  type SectionKey,
  type SectionVisibility,
} from "@/lib/profile-visibility";

/**
 * Sections with no content are hidden on the public profile regardless of this
 * setting, so the toggle is annotated rather than disabled — the user can still
 * decide now for content they add later.
 */
export type SectionContentCounts = Partial<Record<SectionKey, number>>;

export function VisibilityManager({
  initial,
  counts,
}: {
  initial?: SectionVisibility;
  counts?: SectionContentCounts;
}) {
  const { t } = useLocale();
  const { toast } = useToast();
  const [visibility, setVisibility] = useState<SectionVisibility>(
    initial ?? DEFAULT_SECTION_VISIBILITY
  );
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const toggle = (key: SectionKey) => {
    setVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateSectionVisibility(visibility);

      if (result.ok) {
        setDirty(false);
        toast({ title: t("visibility.saved") });
      } else {
        toast({
          title: t("status.error"),
          description: result.message,
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: t("status.error"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6 rounded-xl border bg-card p-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">{t("visibility.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("visibility.subtitle")}</p>
      </div>

      <div className="space-y-6">
        {SECTION_GROUPS.map((group) => (
          <div key={group.id} className="space-y-3">
            {group.id === "contact" && (
              <h3 className="text-sm font-medium text-muted-foreground">
                {t("visibility.showContact")}
              </h3>
            )}

            <div className="space-y-2">
              {group.keys.map((key) => {
                const visible = visibility[key];
                const count = counts?.[key];
                const isEmpty = typeof count === "number" && count === 0;

                return (
                  <label
                    key={key}
                    htmlFor={`visibility-${key}`}
                    className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3 cursor-pointer hover:bg-accent/40 transition-colors"
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      {visible ? (
                        <Eye className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      ) : (
                        <EyeOff className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      )}
                      <span className="min-w-0">
                        <span className="block text-sm font-medium truncate">
                          {t(SECTION_LABEL_KEYS[key])}
                        </span>
                        {isEmpty && (
                          <span className="block text-xs text-muted-foreground">
                            {t("visibility.emptyHint")}
                          </span>
                        )}
                      </span>
                    </span>

                    <Switch
                      id={`visibility-${key}`}
                      checked={visible}
                      onCheckedChange={() => toggle(key)}
                      aria-label={t(SECTION_LABEL_KEYS[key])}
                      data-testid={`toggle-visibility-${key}`}
                    />
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Button onClick={handleSave} disabled={saving || !dirty} data-testid="btn-save-visibility">
        {saving ? t("action.saving") : t("action.save")}
      </Button>
    </section>
  );
}
