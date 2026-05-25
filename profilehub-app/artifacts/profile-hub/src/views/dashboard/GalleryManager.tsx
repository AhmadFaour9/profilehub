"use client";

import { mockGallery } from "@/lib/mock-data";
import type { GalleryItem } from "@/modules/shared";
import { Button } from "@/components/ui/button";
import { Plus, Image as ImageIcon, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function GalleryManager({ gallery = mockGallery }: { gallery?: GalleryItem[] }) {

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif">Gallery</h1>
          <p className="text-muted-foreground mt-1">A visual grid of your work, studio, or behind the scenes.</p>
        </div>
        <Button data-testid="btn-add-image">
          <Plus className="w-4 h-4 mr-2" /> Upload Image
        </Button>
      </div>

      {gallery.length === 0 ? (
        <EmptyState 
          icon={<ImageIcon className="w-6 h-6" />}
          title="Gallery is empty"
          description="Upload photos to create a visual moodboard."
          action={<Button><Plus className="w-4 h-4 mr-2" /> Upload Image</Button>}
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {gallery.map((item) => (
            <div key={item.id} className="aspect-square rounded-xl overflow-hidden relative group">
              <img src={item.imageUrl} alt={item.caption || ""} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button size="sm" variant="destructive" className="w-10 h-10 rounded-full p-0">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
