"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AIFeature } from "@/modules/ai";
import type { Link, Profile, Project } from "@/modules/shared";

const ACTIONS: { feature: AIFeature; label: string }[] = [
  { feature: "generate_bio", label: "Generate Bio" },
  { feature: "order_links", label: "Order Links" },
  { feature: "project_names", label: "Project Names" },
  { feature: "improve_project_description", label: "Improve Project" },
  { feature: "suggest_cta", label: "Suggest CTA" },
  { feature: "brand_score", label: "Brand Score" },
];

export function AIHelperPanel({
  profile,
  links = [],
  projects = [],
}: {
  profile: Profile;
  links?: Link[];
  projects?: Project[];
}) {
  const [result, setResult] = useState<string>("Select an AI action.");
  const [loading, setLoading] = useState<AIFeature | null>(null);

  async function run(feature: AIFeature) {
    setLoading(feature);
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        feature,
        input: {
          displayName: profile.displayName,
          title: profile.title || profile.profession,
          bio: profile.bio,
          location: profile.location,
          website: profile.website,
          links: links.map((link) => ({ title: link.title, description: link.description, type: link.type })),
          projects: projects.map((project) => ({ title: project.title, description: project.description, tags: project.tags })),
        },
      }),
    });
    const data = await response.json();
    setLoading(null);

    if (!response.ok) {
      setResult(data.error || "AI request failed.");
      return;
    }

    setResult(data.content || "No suggestion.");
  }

  return (
    <div className="p-6 border rounded-xl bg-card space-y-4">
      <h2 className="text-lg font-medium flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        AI Assistant
      </h2>
      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((action) => (
          <Button
            key={action.feature}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => run(action.feature)}
            disabled={loading !== null}
          >
            {loading === action.feature ? "Working..." : action.label}
          </Button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground whitespace-pre-line">{result}</p>
    </div>
  );
}
