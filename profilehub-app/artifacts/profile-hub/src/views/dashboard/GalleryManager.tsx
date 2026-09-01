"use client";

import { useLocale } from "@/lib/i18n/client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import type { GalleryItem } from "@/modules/shared";
import { Button } from "@/components/ui/button";
import { Plus, Image as ImageIcon, Loader2, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { deleteGalleryItem, uploadGalleryImage } from "@/app/dashboard/actions";

export default function GalleryManager({ gallery = [] }: { gallery?: GalleryItem[] }) {
  const { t } = useLocale();
  const [items, setItems] = useState<GalleryItem[]>(gallery);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GalleryItem | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setItems(gallery);
  }, [gallery]);

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const result = await uploadGalleryImage(formData);
      if (!result.ok) {
        throw new Error(t("gallery.uploadFailedMessage"));
      }

      const nextItem = normalizeGalleryItem(result.data);
      setItems((current) => [...current, nextItem]);
      toast({ title: t("gallery.uploaded"), description: t("gallery.uploadedMessage") });
    } catch {
      toast({
        title: t("gallery.uploadFailed"),
        description: t("gallery.uploadFailedMessage"),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleteSaving(true);
    try {
      const result = await deleteGalleryItem(deleteTarget.id);
      if (!result.ok) {
        throw new Error(t("gallery.deleteFailedMessage"));
      }

      setItems((current) => current.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast({ title: t("gallery.deleted"), description: t("gallery.deletedMessage") });
    } catch {
      toast({
        title: t("gallery.deleteFailed"),
        description: t("gallery.deleteFailedMessage"),
        variant: "destructive",
      });
    } finally {
      setDeleteSaving(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-8">
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif">{t("gallery.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("gallery.gridHint")}</p>
        </div>
        <Button data-testid="btn-add-image" onClick={openFilePicker} disabled={uploading}>
          {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          {uploading ? t("gallery.uploading") : t("gallery.uploadImage")}
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState 
          icon={<ImageIcon className="w-6 h-6" />}
          title={t("gallery.emptyTitle")}
          description={t("gallery.emptyBody")}
          action={
            <Button onClick={openFilePicker} disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              {uploading ? t("gallery.uploading") : t("gallery.uploadImage")}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((item) => (
            <div key={item.id} className="aspect-square rounded-xl overflow-hidden relative group">
              <img src={item.imageUrl} alt={item.caption || ""} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="w-10 h-10 rounded-full p-0"
                  onClick={() => setDeleteTarget(item)}
                  aria-label={t("gallery.deleteImage")}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("gallery.deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>{t("gallery.deleteBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSaving}>{t("action.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteSaving}
              onClick={(event) => {
                event.preventDefault();
                handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("action.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function normalizeGalleryItem(value: unknown): GalleryItem {
  const row = (value || {}) as Record<string, any>;

  return {
    id: row.id || `gallery_${Date.now()}`,
    profileId: row.profileId || row.profile_id,
    url: row.url || row.imageUrl || row.image_url || "",
    imageUrl: row.imageUrl || row.image_url || row.url || "",
    alt: row.alt || row.caption || "",
    caption: row.caption || row.alt || "",
    type: row.type || "image",
    position: row.position ?? row.order ?? 0,
    order: row.order ?? row.position ?? 0,
    createdAt: row.createdAt || row.created_at || new Date().toISOString(),
  };
}
