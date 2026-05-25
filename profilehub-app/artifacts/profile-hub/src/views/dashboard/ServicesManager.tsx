"use client";

import { mockServices } from "@/lib/mock-data";
import type { Service } from "@/modules/shared";
import { Button } from "@/components/ui/button";
import { Plus, Box } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ServiceCard } from "@/components/profile/ServiceCard";

export default function ServicesManager({ services = mockServices }: { services?: Service[] }) {

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif">Services</h1>
          <p className="text-muted-foreground mt-1">List what you offer and how much it costs.</p>
        </div>
        <Button data-testid="btn-add-service">
          <Plus className="w-4 h-4 mr-2" /> Add Service
        </Button>
      </div>

      {services.length === 0 ? (
        <EmptyState 
          icon={<Box className="w-6 h-6" />}
          title="No services listed"
          description="Offer services to your audience directly from your profile."
          action={<Button><Plus className="w-4 h-4 mr-2" /> Add Service</Button>}
        />
      ) : (
        <div className="grid gap-6">
          {services.map((service) => (
            <div key={service.id} className="relative group">
              <ServiceCard service={service} theme={{ id: "default", buttonStyle: "rounded" }} />
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
