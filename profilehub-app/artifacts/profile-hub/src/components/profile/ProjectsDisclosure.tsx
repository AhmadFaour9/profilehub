"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/**
 * The "more projects" disclosure on a public profile.
 *
 * Built on <details>/<summary> like the skills section, so the collapsed cards
 * are still in the HTML: indexed, and findable with the browser's page search.
 *
 * The one thing native <details> does not do everywhere is open itself when a
 * link targets something inside it. Skill chips link to `#project-<id>`, and a
 * link that lands on a closed box looks broken, so this opens on such a hash.
 */
export function ProjectsDisclosure({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const reveal = () => {
      const details = ref.current;
      const id = window.location.hash.slice(1);
      if (!details || !id) return;

      const target = document.getElementById(id);
      if (!target || !details.contains(target)) return;

      details.open = true;
      target.scrollIntoView({ block: "start" });
    };

    reveal();
    window.addEventListener("hashchange", reveal);
    return () => window.removeEventListener("hashchange", reveal);
  }, []);

  return (
    <details ref={ref} className="group/more rounded-2xl border bg-card/60" data-testid="more-projects">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold hover:bg-accent/40 [&::-webkit-details-marker]:hidden">
        <span>{label}</span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open/more:rotate-180"
          aria-hidden
        />
      </summary>

      <div className="space-y-6 border-t px-4 py-4">{children}</div>
    </details>
  );
}
