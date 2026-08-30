"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Plus, Sparkles, Trash2, X } from "lucide-react";

import { createSkillGroup, deleteSkill, deleteSkillCategory } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/lib/i18n/client";
import { getCategoryTone, getSkillIcon } from "@/lib/skill-icons";
import type { Skill } from "@/modules/shared";

export default function SkillsManager({ skills: initial }: { skills: Skill[] }) {
  const { t } = useLocale();
  const { toast } = useToast();

  const [skills, setSkills] = useState<Skill[]>(initial);
  const [category, setCategory] = useState("");
  const [names, setNames] = useState("");
  const [saving, setSaving] = useState(false);

  const groups = useMemo(() => {
    const map = new Map<string, Skill[]>();
    for (const skill of skills) {
      const key = skill.category.trim();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(skill);
    }
    return [...map.entries()]
      .map(([name, items]) => ({ name, items: [...items].sort((a, b) => a.position - b.position) }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [skills]);

  const handleAddGroup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!category.trim() || !names.trim()) return;

    setSaving(true);
    try {
      const result = await createSkillGroup({ category, names });

      if (!result.ok) {
        toast({ title: t("status.error"), description: result.message, variant: "destructive" });
        return;
      }

      const { added = 0, skipped = 0 } = result.data ?? {};
      toast({
        title: t("skills.added", { count: added }),
        description: skipped ? t("skills.duplicatesSkipped", { count: skipped }) : undefined,
      });

      setNames("");
      // The server owns ids and positions, so re-read rather than guessing.
      window.location.reload();
    } catch {
      toast({ title: t("status.error"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSkill = async (skill: Skill) => {
    const previous = skills;
    setSkills((current) => current.filter((item) => item.id !== skill.id));

    const result = await deleteSkill(skill.id);
    if (!result.ok) {
      setSkills(previous);
      toast({ title: t("status.error"), description: result.message, variant: "destructive" });
    }
  };

  const handleDeleteCategory = async (name: string) => {
    const previous = skills;
    setSkills((current) => current.filter((item) => item.category.trim() !== name));

    const result = await deleteSkillCategory(name);
    if (!result.ok) {
      setSkills(previous);
      toast({ title: t("status.error"), description: result.message, variant: "destructive" });
    }
  };

  return (
    <div className="max-w-4xl space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-serif">{t("skills.title")}</h1>
        <p className="text-muted-foreground">{t("skills.subtitle")}</p>
      </header>

      <form onSubmit={handleAddGroup} className="space-y-4 rounded-xl border bg-card p-6">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_2fr]">
          <label className="space-y-2 text-sm font-medium">
            <span>{t("skills.category")}</span>
            <Input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder={t("skills.categoryPlaceholder")}
              maxLength={60}
              required
              data-testid="skill-category"
            />
          </label>

          <label className="space-y-2 text-sm font-medium">
            <span>{t("skills.names")}</span>
            <Textarea
              value={names}
              onChange={(event) => setNames(event.target.value)}
              placeholder={t("skills.namesPlaceholder")}
              rows={3}
              required
              data-testid="skill-names"
            />
          </label>
        </div>

        <p className="text-xs text-muted-foreground">{t("skills.namesHint")}</p>

        <Button type="submit" disabled={saving} data-testid="btn-add-skill-group">
          <Plus className="me-2 h-4 w-4" aria-hidden />
          {saving ? t("action.saving") : t("skills.addGroup")}
        </Button>
      </form>

      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden />
          <h2 className="mt-3 font-medium">{t("skills.emptyTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("skills.emptyBody")}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => {
            const tone = getCategoryTone(group.name);

            return (
              <section key={group.name} className="rounded-xl border bg-card p-5">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {group.name}
                    <span className="ms-2 font-normal normal-case tracking-normal">
                      ({group.items.length})
                    </span>
                  </h2>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleDeleteCategory(group.name)}
                    aria-label={t("skills.deleteCategory")}
                    title={t("skills.deleteCategory")}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>

                <ul className="flex flex-wrap gap-2">
                  {group.items.map((skill) => {
                    const Icon = getSkillIcon(skill.name);

                    return (
                      <li
                        key={skill.id}
                        className="group inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-1.5 text-sm"
                      >
                        {Icon ? (
                          <Icon className={`h-4 w-4 shrink-0 ${tone}`} aria-hidden />
                        ) : (
                          <Sparkles className={`h-3.5 w-3.5 shrink-0 ${tone}`} aria-hidden />
                        )}
                        <span className="font-medium">{skill.name}</span>

                        <button
                          type="button"
                          onClick={() => handleDeleteSkill(skill)}
                          className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`${t("action.delete")}: ${skill.name}`}
                        >
                          <X className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
