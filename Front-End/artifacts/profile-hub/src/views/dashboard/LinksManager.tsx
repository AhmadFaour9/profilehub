"use client";

import { useState } from "react";
import { mockLinks } from "@/lib/mock-data";
import type { Link } from "@/modules/shared";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Link as LinkIcon, Plus, GripVertical, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function LinksManager({ initialLinks = mockLinks }: { initialLinks?: Link[] }) {
  const [links] = useState(initialLinks);

  if (links.length === 0) {
    return (
      <div className="max-w-4xl space-y-6">
        <h1 className="text-3xl font-serif">Smart Links</h1>
        <EmptyState 
          icon={<LinkIcon className="w-6 h-6" />}
          title="No links yet"
          description="Add links to your portfolio, articles, or social profiles."
          action={<Button><Plus className="w-4 h-4 mr-2" /> Add Link</Button>}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif">Smart Links</h1>
          <p className="text-muted-foreground mt-1">Manage the links on your profile.</p>
        </div>
        <Button data-testid="btn-add-link">
          <Plus className="w-4 h-4 mr-2" /> Add Link
        </Button>
      </div>

      <div className="space-y-4">
        {links.map((link) => (
          <div key={link.id} className="flex items-center gap-4 p-4 border rounded-xl bg-card hover:border-primary/50 transition-colors" data-testid={`link-row-${link.id}`}>
            <button className="cursor-grab text-muted-foreground hover:text-foreground">
              <GripVertical className="w-5 h-5" />
            </button>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-foreground truncate">{link.title}</h3>
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-sm text-muted-foreground truncate">{link.url}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="bg-muted px-2 py-0.5 rounded">{link.clickCount} clicks</span>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <Switch checked={link.isActive} />
              <div className="flex items-center gap-1 border-l pl-4 ml-2">
                <Button variant="ghost" size="icon" className="w-8 h-8">
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
