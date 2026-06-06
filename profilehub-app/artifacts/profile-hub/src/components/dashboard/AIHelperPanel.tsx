"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AIFeature } from "@/modules/ai";
import type { Link, Profile, Project } from "@/modules/shared";

const ACTIONS: { feature: AIFeature; label: string }[] = [
  { feature: "generate_bio", label: "Generate Bio" },
  { feature: "improve_bio", label: "Improve Bio" },
  { feature: "suggest_smart_links", label: "Suggest Smart Links" },
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
  const [providerMessage, setProviderMessage] = useState<string | null>(null);
  const [providerMessageType, setProviderMessageType] = useState<"live" | "fallback">("live");
  const [loading, setLoading] = useState<AIFeature | null>(null);

  async function run(feature: AIFeature) {
    setLoading(feature);
    setProviderMessage(null);
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

    if (data.fallback) {
      setProviderMessageType("fallback");
      setProviderMessage("Live AI unavailable, local fallback used.");
    } else if (data.model) {
      setProviderMessageType("live");
      setProviderMessage(`Live AI used: ${data.model}`);
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
      {providerMessage ? (
        <div
          className={
            providerMessageType === "fallback"
              ? "rounded-lg border border-amber-300/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-200"
              : "rounded-lg border border-emerald-300/50 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-200"
          }
        >
          {providerMessage}
        </div>
      ) : null}
      <p className="text-sm text-muted-foreground whitespace-pre-line">{result}</p>
    </div>
  );
}
