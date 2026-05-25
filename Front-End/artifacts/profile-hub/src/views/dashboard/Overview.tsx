"use client";

import Link from "next/link";
import { useTranslation } from "@/hooks/use-translation";
import { mockUser, mockAnalyticsOverview } from "@/lib/mock-data";
import type { AnalyticsOverview, Link as ProfileLink, LinkAnalytics, Profile, Project } from "@/modules/shared";
import { AnalyticsCards } from "@/components/dashboard/AnalyticsCards";
import { AIHelperPanel } from "@/components/dashboard/AIHelperPanel";
import { Button } from "@/components/ui/button";
import { ArrowRight, Link as LinkIcon, Briefcase } from "lucide-react";

export default function Overview({
  profile = mockUser,
  analytics = mockAnalyticsOverview,
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
  const firstName = (profile.displayName || profile.username).split(" ")[0];

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-3xl font-serif text-foreground">{t("dashboard.greeting")}, {firstName}</h1>
        <p className="text-muted-foreground mt-1">Here is how your profile is performing today.</p>
      </div>

      <AnalyticsCards data={analytics} />

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

        <div className="p-6 border rounded-xl bg-card flex flex-col items-start justify-center">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Briefcase className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-lg font-medium mb-1">Add a new project</h2>
          <p className="text-sm text-muted-foreground mb-4">Keep your portfolio fresh by adding your latest work.</p>
          <Button asChild>
            <Link href="/dashboard/projects">Add Project</Link>
          </Button>
        </div>
      </div>

      <AIHelperPanel profile={profile} links={links} projects={projects} />
    </div>
  );
}
