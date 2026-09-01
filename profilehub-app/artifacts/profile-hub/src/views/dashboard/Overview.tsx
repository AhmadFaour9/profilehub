"use client";

import Link from "next/link";
import { useTranslation } from "@/hooks/use-translation";
import type { AnalyticsOverview, Link as ProfileLink, LinkAnalytics, Profile, Project } from "@/modules/shared";
import { AnalyticsCards } from "@/components/dashboard/AnalyticsCards";
import { AIHelperPanel } from "@/components/dashboard/AIHelperPanel";
import { Button } from "@/components/ui/button";
import { ArrowRight, Link as LinkIcon, Briefcase } from "lucide-react";

export default function Overview({
  profile,
  analytics,
  topLinks = [],
  links = [],
  projects = [],
}: {
  profile?: Profile;
  analytics?: AnalyticsOverview;
  topLinks?: LinkAnalytics[];
  links?: ProfileLink[];
  projects?: Project[];
}) {
  const { t } = useTranslation();
  const firstName = profile ? (profile.displayName || profile.username).split(" ")[0] : "there";

  return (
    <div className="min-w-0 max-w-5xl space-y-8">
      <div>
        <h1 className="break-words text-3xl font-serif text-foreground [overflow-wrap:anywhere]">{t("dashboard.greeting")}, {firstName}</h1>
        <p className="text-muted-foreground mt-1">{t("dashboard.todaySubtitle")}</p>
      </div>

      {analytics && <AnalyticsCards data={analytics} />}

      <div className="grid min-w-0 gap-6 md:grid-cols-2">
        <div className="min-w-0 rounded-xl border bg-card p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex min-w-0 items-center gap-2 break-words text-lg font-medium [overflow-wrap:anywhere]">
              <LinkIcon className="h-5 w-5 shrink-0 text-primary" />{t("dashboard.linksPerformance")}</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/analytics">{t("dashboard.viewAll")}<ArrowRight className="w-4 h-4 ml-1" /></Link>
            </Button>
          </div>
          <div className="space-y-4">
            {(topLinks.length > 0 ? topLinks : []).map((link) => (
              <div className="flex min-w-0 items-center justify-between gap-3" key={link.linkId}>
                <span className="min-w-0 flex-1 truncate text-sm font-medium" title={link.title}>{link.title}</span>
                <span className="shrink-0 text-sm text-muted-foreground">{link.clicks.toLocaleString()} clicks</span>
              </div>
            ))}
            {topLinks.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("dashboard.noClicks")}</p>
            )}
          </div>
        </div>

        <div className="min-w-0 rounded-xl border bg-card p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex min-w-0 items-center gap-2 break-words text-lg font-medium [overflow-wrap:anywhere]">
              <Briefcase className="h-5 w-5 shrink-0 text-primary" />{t("projects.title")}</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/projects">{t("dashboard.manage")}<ArrowRight className="w-4 h-4 ml-1" /></Link>
            </Button>
          </div>
          {projects.length > 0 ? (
            <div className="space-y-3">
              {projects.slice(0, 3).map((project) => (
                <div key={project.id} className="min-w-0 rounded-lg border p-3">
                  <p className="block min-w-0 truncate text-sm font-medium" title={project.title}>{project.title}</p>
                  {project.description ? (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{project.description}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-start">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Briefcase className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-base font-medium mb-1">{t("dashboard.addProjectTitle")}</h3>
              <p className="text-sm text-muted-foreground mb-4">{t("dashboard.addProjectBody")}</p>
              <Button asChild>
                <Link href="/dashboard/projects">{t("projects.addProject")}</Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {profile && <AIHelperPanel profile={profile} links={links} projects={projects} />}
    </div>
  );
}
