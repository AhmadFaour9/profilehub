"use client";

import { useLocale } from "@/lib/i18n/client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Service } from "@/modules/shared";
import { createService, deleteService, updateService } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowDown, ArrowUp, Box, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ServiceCard } from "@/components/profile/ServiceCard";
import { useToast } from "@/hooks/use-toast";

type ServiceFormState = {
  title: string;
  description: string;
  price: string;
  duration: string;
  ctaLabel: string;
  ctaUrl: string;
  icon: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
};

function serviceOrder(service: Service, fallback = 0) {
  return service.sortOrder ?? service.order ?? service.position ?? fallback;
}

function sortServices(services: Service[]) {
  return [...services].sort((a, b) => serviceOrder(a) - serviceOrder(b) || a.title.localeCompare(b.title));
}

function emptyForm(sortOrder: number): ServiceFormState {
  return {
    title: "",
    description: "",
    price: "",
    duration: "",
    ctaLabel: "Inquire",
    ctaUrl: "",
    icon: "",
    imageUrl: "",
    sortOrder,
    isActive: true,
  };
}

function formFromService(service: Service): ServiceFormState {
  return {
    title: service.title || "",
    description: service.description || "",
    price: service.priceLabel || service.price || "",
    duration: service.duration || "",
    ctaLabel: service.ctaLabel || "",
    ctaUrl: service.ctaUrl || "",
    icon: service.icon || "",
    imageUrl: service.imageUrl || "",
    sortOrder: serviceOrder(service),
    isActive: service.isActive,
  };
}

function normalizeService(row: any, fallback?: Service): Service {
  const sortOrder = row.sortOrder ?? row.sort_order ?? row.position ?? fallback?.sortOrder ?? fallback?.position ?? 0;
  return {
    id: row.id || fallback?.id || `service_${Date.now()}`,
    profileId: row.profileId || row.profile_id || fallback?.profileId,
    title: row.title ?? fallback?.title ?? "",
    description: row.description ?? fallback?.description ?? "",
    priceLabel: row.priceLabel ?? row.price_label ?? row.price ?? fallback?.priceLabel ?? "",
    price: row.price ?? row.priceLabel ?? row.price_label ?? fallback?.price ?? fallback?.priceLabel ?? "",
    duration: row.duration ?? fallback?.duration ?? "",
    icon: row.icon ?? fallback?.icon ?? "",
    imageUrl: row.imageUrl ?? row.image_url ?? fallback?.imageUrl ?? "",
    ctaLabel: row.ctaLabel ?? row.cta_label ?? fallback?.ctaLabel ?? "",
    ctaUrl: row.ctaUrl ?? row.cta_url ?? fallback?.ctaUrl ?? "",
    position: sortOrder,
    order: sortOrder,
    sortOrder,
    isActive: row.isActive ?? row.is_active ?? fallback?.isActive ?? true,
    createdAt: row.createdAt || row.created_at || fallback?.createdAt || new Date().toISOString(),
    updatedAt: row.updatedAt || row.updated_at || fallback?.updatedAt,
  };
}

export default function ServicesManager({ services = [] }: { services?: Service[] }) {
  const { t } = useLocale();
  const router = useRouter();
  const { toast } = useToast();
  const [allServices, setAllServices] = useState<Service[]>(() => sortServices(services));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceFormState>(() => emptyForm(services.length));
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  function updateForm<K extends keyof ServiceFormState>(key: K, value: ServiceFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openCreateDialog() {
    setEditingService(null);
    setForm(emptyForm(allServices.length));
    setDialogOpen(true);
  }

  function openEditDialog(service: Service) {
    setEditingService(service);
    setForm(formFromService(service));
    setDialogOpen(true);
  }

  async function saveService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    const payload = {
      title: form.title,
      description: form.description,
      price: form.price,
      priceLabel: form.price,
      duration: form.duration,
      ctaLabel: form.ctaLabel,
      ctaUrl: form.ctaUrl,
      icon: form.icon,
      imageUrl: form.imageUrl,
      sortOrder: form.sortOrder,
      isActive: form.isActive,
    };

    try {
      const result = editingService ? await updateService(editingService.id, payload) : await createService(payload);
      if (!result.ok) {
        throw new Error(result.message || "Could not save service.");
      }

      const saved = normalizeService(result.data, editingService || undefined);
      setAllServices((current) =>
        sortServices(editingService ? current.map((service) => (service.id === editingService.id ? saved : service)) : [...current, saved])
      );
      setDialogOpen(false);
      setEditingService(null);
      router.refresh();
      toast({
        title: editingService ? "Service updated" : "Service created",
        description: "Your services section has been saved.",
      });
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error?.message || "Could not save service.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function patchService(service: Service, patch: Partial<Service>) {
    const result = await updateService(service.id, patch);
    if (!result.ok) {
      toast({
        title: "Update failed",
        description: result.message || "Could not update service.",
        variant: "destructive",
      });
      return false;
    }

    const updated = normalizeService(result.data, { ...service, ...patch });
    setAllServices((current) => sortServices(current.map((item) => (item.id === service.id ? updated : item))));
    router.refresh();
    return true;
  }

  async function moveService(service: Service, direction: -1 | 1) {
    const sorted = sortServices(allServices);
    const index = sorted.findIndex((item) => item.id === service.id);
    const swapIndex = index + direction;
    if (index < 0 || swapIndex < 0 || swapIndex >= sorted.length) return;

    const other = sorted[swapIndex];
    const serviceSort = serviceOrder(service, index);
    const otherSort = serviceOrder(other, swapIndex);
    const [first, second] = await Promise.all([
      updateService(service.id, { sortOrder: otherSort }),
      updateService(other.id, { sortOrder: serviceSort }),
    ]);

    if (!first.ok || !second.ok) {
      toast({
        title: "Reorder failed",
        description: first.message || second.message || "Could not reorder services.",
        variant: "destructive",
      });
      return;
    }

    setAllServices((current) =>
      sortServices(
        current.map((item) => {
          if (item.id === service.id) return normalizeService({ ...item, sortOrder: otherSort }, item);
          if (item.id === other.id) return normalizeService({ ...item, sortOrder: serviceSort }, item);
          return item;
        })
      )
    );
    router.refresh();
  }

  async function confirmDeleteService() {
    if (!deleteTarget) return;
    setDeleteSaving(true);

    try {
      const result = await deleteService(deleteTarget.id);
      if (!result.ok) {
        throw new Error(result.message || "Could not delete service.");
      }

      setAllServices((current) => current.filter((service) => service.id !== deleteTarget.id));
      setDeleteTarget(null);
      router.refresh();
      toast({ title: "Service deleted", description: "The service has been removed from your profile." });
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error?.message || "Could not delete service.",
        variant: "destructive",
      });
    } finally {
      setDeleteSaving(false);
    }
  }

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif">{t("services.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("services.subtitle")}</p>
        </div>
        <Button onClick={openCreateDialog} data-testid="btn-add-service">
          <Plus className="w-4 h-4 mr-2" />{t("services.addService")}</Button>
      </div>

      {allServices.length === 0 ? (
        <EmptyState
          icon={<Box className="w-6 h-6" />}
          title={t("services.emptyTitle")}
          description={t("services.emptyBody")}
          action={
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />{t("services.addService")}</Button>
          }
        />
      ) : (
        <div className="grid gap-6">
          {allServices.map((service, index) => (
            <div key={service.id} className="relative group" data-testid={`service-row-${service.id}`}>
              <ServiceCard service={service} theme={{ id: "default", buttonStyle: "rounded" }} />
              <div className="absolute top-4 right-4 z-10 flex flex-wrap gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button type="button" size="icon" variant="secondary" className="h-8 w-8" onClick={() => moveService(service, -1)} disabled={index === 0} title={t("form.moveUp")}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="secondary" className="h-8 w-8" onClick={() => moveService(service, 1)} disabled={index === allServices.length - 1} title={t("form.moveDown")}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <div className="flex h-8 items-center gap-2 rounded-md border bg-background px-2 text-xs">{t("status.active")}<Switch checked={service.isActive} onCheckedChange={(checked) => patchService(service, { isActive: checked })} />
                </div>
                <Button type="button" size="sm" variant="secondary" onClick={() => openEditDialog(service)}>
                  <Pencil className="h-4 w-4 mr-1" />{t("action.edit")}</Button>
                <Button type="button" size="sm" variant="destructive" onClick={() => setDeleteTarget(service)}>
                  <Trash2 className="h-4 w-4 mr-1" />{t("action.delete")}</Button>
              </div>
              {!service.isActive && (
                <div className="absolute left-4 top-4 rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">{t("status.inactive")}</div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) setEditingService(null);
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingService ? "Edit Service" : "Add Service"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveService} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="service-title">{t("form.title")}</Label>
                <Input
                  id="service-title"
                  value={form.title}
                  onChange={(event) => updateForm("title", event.target.value)}
                  required
                  maxLength={100}
                  data-testid="input-service-title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service-price">{t("form.price")}</Label>
                <Input
                  id="service-price"
                  value={form.price}
                  onChange={(event) => updateForm("price", event.target.value)}
                  placeholder={t("services.pricePlaceholder")}
                  maxLength={80}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="service-description">{t("form.description")}</Label>
              <Textarea
                id="service-description"
                value={form.description}
                onChange={(event) => updateForm("description", event.target.value)}
                rows={4}
                maxLength={800}
                data-testid="input-service-description"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="service-duration">{t("form.duration")}</Label>
                <Input
                  id="service-duration"
                  value={form.duration}
                  onChange={(event) => updateForm("duration", event.target.value)}
                  placeholder="30 min, 2 weeks, ongoing"
                  maxLength={80}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service-cta-label">{t("form.ctaLabel")}</Label>
                <Input
                  id="service-cta-label"
                  value={form.ctaLabel}
                  onChange={(event) => updateForm("ctaLabel", event.target.value)}
                  placeholder={t("services.ctaPlaceholder")}
                  maxLength={60}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="service-cta-url">{t("form.ctaUrl")}</Label>
              <Input
                id="service-cta-url"
                value={form.ctaUrl}
                onChange={(event) => updateForm("ctaUrl", event.target.value)}
                placeholder="https://cal.com/... or mailto:name@example.com"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="service-icon">{t("form.icon")}</Label>
                <Input
                  id="service-icon"
                  value={form.icon}
                  onChange={(event) => updateForm("icon", event.target.value)}
                  placeholder="consult, code, design"
                  maxLength={40}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service-image">{t("form.imageUrl")}</Label>
                <Input
                  id="service-image"
                  value={form.imageUrl}
                  onChange={(event) => updateForm("imageUrl", event.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="service-sort-order">{t("form.sortOrder")}</Label>
                <Input
                  id="service-sort-order"
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(event) => updateForm("sortOrder", Number(event.target.value))}
                />
              </div>
              <div className="flex items-center gap-3 pt-7">
                <Switch checked={form.isActive} onCheckedChange={(checked) => updateForm("isActive", checked)} />
                <Label>{t("form.activeOnProfile")}</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>{t("action.cancel")}</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingService ? "Save Service" : "Create Service"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("services.deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {deleteTarget?.title ? `"${deleteTarget.title}"` : "this service"} from your profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSaving}>{t("action.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteSaving}
              onClick={(event) => {
                event.preventDefault();
                confirmDeleteService();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
