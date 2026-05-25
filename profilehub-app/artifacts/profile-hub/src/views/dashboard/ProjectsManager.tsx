"use client";

import { mockProjects } from "@/lib/mock-data";
import type { Project } from "@/modules/shared";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProjectCard } from "@/components/profile/ProjectCard";

export default function ProjectsManager({ projects = mockProjects }: { projects?: Project[] }) {

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif">Projects</h1>
          <p className="text-muted-foreground mt-1">Showcase your best work.</p>
        </div>
        <Button data-testid="btn-add-project">
          <Plus className="w-4 h-4 mr-2" /> Add Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <EmptyState 
          icon={<Briefcase className="w-6 h-6" />}
          title="No projects yet"
          description="Add your first project to showcase your work to visitors."
          action={<Button><Plus className="w-4 h-4 mr-2" /> Add Project</Button>}
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="relative group">
              <ProjectCard project={project} theme={{ id: "default", buttonStyle: "rounded" }} />
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="sm" variant="secondary">Edit</Button>
                <Button size="sm" variant="destructive">Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
