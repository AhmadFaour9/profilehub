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
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-3xl font-serif text-foreground">{t("dashboard.greeting")}, {firstName}</h1>
        <p className="text-muted-foreground mt-1">Here is how your profile is performing today.</p>
      </div>

      {analytics && <AnalyticsCards data={analytics} />}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-6 border rounded-xl bg-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-primary" />
              Links Performance
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/analytics">View All <ArrowRight className="w-4 h-4 ml-1" /></Link>
            </Button>
          </div>
          <div className="space-y-4">
            {(topLinks.length > 0 ? topLinks : []).map((link) => (
              <div className="flex items-center justify-between" key={link.linkId}>
                <span className="text-sm font-medium truncate">{link.title}</span>
                <span className="text-sm text-muted-foreground">{link.clicks.toLocaleString()} clicks</span>
              </div>
            ))}
            {topLinks.length === 0 && (
              <p className="text-sm text-muted-foreground">No link clicks yet.</p>
            )}
          </div>
        </div>

        <div className="p-6 border rounded-xl bg-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              Projects
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/projects">Manage <ArrowRight className="w-4 h-4 ml-1" /></Link>
            </Button>
          </div>
          {projects.length > 0 ? (
            <div className="space-y-3">
              {projects.slice(0, 3).map((project) => (
                <div key={project.id} className="rounded-lg border p-3">
                  <p className="text-sm font-medium truncate">{project.title}</p>
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
              <h3 className="text-base font-medium mb-1">Add a new project</h3>
              <p className="text-sm text-muted-foreground mb-4">Keep your portfolio fresh by adding your latest work.</p>
              <Button asChild>
                <Link href="/dashboard/projects">Add Project</Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {profile && <AIHelperPanel profile={profile} links={links} projects={projects} />}
    </div>
  );
}
