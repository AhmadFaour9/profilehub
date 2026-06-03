"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Link as SmartLink, SocialLink } from "@/modules/shared";
import { createLink, deleteLink, saveSocialLinks, updateLink } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  GripVertical,
  ImageIcon,
  Link as LinkIcon,
  Pencil,
  Plus,
  Star,
  Trash2,
} from "lucide-react";

const SOCIAL_PLATFORMS = [
  { id: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/..." },
  { id: "github", label: "GitHub", placeholder: "https://github.com/..." },
  { id: "twitter", label: "X / Twitter", placeholder: "https://x.com/..." },
  { id: "instagram", label: "Instagram", placeholder: "https://instagram.com/..." },
  { id: "youtube", label: "YouTube", placeholder: "https://youtube.com/@..." },
  { id: "behance", label: "Behance", placeholder: "https://behance.net/..." },
  { id: "dribbble", label: "Dribbble", placeholder: "https://dribbble.com/..." },
  { id: "facebook", label: "Facebook", placeholder: "https://facebook.com/..." },
  { id: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@..." },
  { id: "whatsapp", label: "WhatsApp", placeholder: "https://wa.me/..." },
  { id: "email", label: "Email", placeholder: "mailto:name@example.com" },
] as const;

type LinkFormState = {
  title: string;
  url: string;
  description: string;
  icon: string;
  thumbnailUrl: string;
  category: string;
  sortOrder: number;
  isActive: boolean;
  isFeatured: boolean;
};

const emptyForm = (sortOrder: number): LinkFormState => ({
  title: "",
  url: "",
  description: "",
  icon: "",
  thumbnailUrl: "",
  category: "",
  sortOrder,
  isActive: true,
  isFeatured: false,
});

function sortSmartLinks(links: SmartLink[]) {
  return [...links].sort((a, b) => {
    const orderA = a.sortOrder ?? a.order ?? a.position ?? 0;
    const orderB = b.sortOrder ?? b.order ?? b.position ?? 0;
    return orderA - orderB || a.title.localeCompare(b.title);
  });
}

function formFromLink(link: SmartLink): LinkFormState {
  return {
    title: link.title,
    url: link.url,
    description: link.description || "",
    icon: link.icon || "",
    thumbnailUrl: link.thumbnailUrl || link.imageUrl || "",
    category: link.category || link.type || "",
    sortOrder: link.sortOrder ?? link.order ?? link.position ?? 0,
    isActive: link.isActive,
    isFeatured: Boolean(link.isFeatured),
  };
}

function linkWithPatch(link: SmartLink, patch: Partial<SmartLink>): SmartLink {
  return {
    ...link,
    ...patch,
    thumbnailUrl: patch.thumbnailUrl ?? patch.imageUrl ?? link.thumbnailUrl,
    imageUrl: patch.imageUrl ?? patch.thumbnailUrl ?? link.imageUrl,
    category: patch.category ?? patch.type ?? link.category,
    type: patch.type ?? patch.category ?? link.type,
    position: patch.position ?? patch.sortOrder ?? link.position,
    order: patch.order ?? patch.sortOrder ?? link.order,
    sortOrder: patch.sortOrder ?? patch.position ?? link.sortOrder,
  };
}

export default function LinksManager({
  initialLinks = [],
  initialSocialLinks = [],
}: {
  initialLinks?: SmartLink[];
  initialSocialLinks?: SocialLink[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [links, setLinks] = useState(() => sortSmartLinks(initialLinks));
  const [socialUrls, setSocialUrls] = useState<Record<string, string>>(() => {
    const values: Record<string, string> = {};
    SOCIAL_PLATFORMS.forEach((platform) => {
      values[platform.id] = initialSocialLinks.find((link) => link.platform === platform.id)?.url || "";
    });
    return values;
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<SmartLink | null>(null);
  const [form, setForm] = useState<LinkFormState>(() => emptyForm(initialLinks.length));
  const [saving, setSaving] = useState(false);
  const [savingSocial, setSavingSocial] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());

  const totalClicks = useMemo(() => links.reduce((sum, link) => sum + (link.clickCount || 0), 0), [links]);

  function openCreateDialog() {
    setEditingLink(null);
    setForm(emptyForm(links.length));
    setDialogOpen(true);
  }

  function openEditDialog(link: SmartLink) {
    setEditingLink(link);
    setForm(formFromLink(link));
    setDialogOpen(true);
  }

  function updateForm<K extends keyof LinkFormState>(key: K, value: LinkFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSaveSocialLinks() {
    setSavingSocial(true);
    const result = await saveSocialLinks(
      SOCIAL_PLATFORMS.map((platform) => ({
        platform: platform.id,
        url: socialUrls[platform.id] || "",
      }))
    );
    setSavingSocial(false);

    toast({
      title: result.ok ? "Social links saved" : "Could not save social links",
      description: result.message || "Social accounts will appear in the public profile header.",
      variant: result.ok ? "default" : "destructive",
    });
    if (result.ok) router.refresh();
  }

  async function handleSaveSmartLink() {
    setSaving(true);
    const payload = {
      title: form.title,
      url: form.url,
      description: form.description,
      icon: form.icon,
      thumbnailUrl: form.thumbnailUrl,
      category: form.category,
      sortOrder: form.sortOrder,
      isActive: form.isActive,
      isFeatured: form.isFeatured,
    };
    const result = editingLink ? await updateLink(editingLink.id, payload) : await createLink(payload);
    setSaving(false);

    if (!result.ok) {
      toast({
        title: editingLink ? "Could not update link" : "Could not create link",
        description: result.message || "Please check the link details and try again.",
        variant: "destructive",
      });
      return;
    }

    const savedLink = result.data as SmartLink;
    setLinks((current) =>
      sortSmartLinks(
        editingLink
          ? current.map((link) => (link.id === editingLink.id ? savedLink : link))
          : [...current, savedLink]
      )
    );
    setDialogOpen(false);
    router.refresh();
    toast({ title: editingLink ? "Link updated" : "Link created" });
  }

  async function patchSmartLink(link: SmartLink, patch: Partial<SmartLink>) {
    const result = await updateLink(link.id, patch);
    if (!result.ok) {
      toast({
        title: "Could not update link",
        description: result.message || "Please try again.",
        variant: "destructive",
      });
      return false;
    }

    setLinks((current) => sortSmartLinks(current.map((item) => (item.id === link.id ? linkWithPatch(item, patch) : item))));
    router.refresh();
    return true;
  }

  async function handleDelete(link: SmartLink) {
    if (!window.confirm(`Delete "${link.title}"?`)) return;
    const result = await deleteLink(link.id);
    if (!result.ok) {
      toast({
        title: "Could not delete link",
        description: result.message || "Please try again.",
        variant: "destructive",
      });
      return;
    }

    setLinks((current) => current.filter((item) => item.id !== link.id));
    router.refresh();
    toast({ title: "Link deleted" });
  }

  async function moveLink(link: SmartLink, direction: -1 | 1) {
    const sorted = sortSmartLinks(links);
    const index = sorted.findIndex((item) => item.id === link.id);
    const swapIndex = index + direction;
    if (index < 0 || swapIndex < 0 || swapIndex >= sorted.length) return;

    const other = sorted[swapIndex];
    const linkOrder = link.sortOrder ?? link.order ?? link.position ?? index;
    const otherOrder = other.sortOrder ?? other.order ?? other.position ?? swapIndex;
    const [first, second] = await Promise.all([
      updateLink(link.id, { sortOrder: otherOrder }),
      updateLink(other.id, { sortOrder: linkOrder }),
    ]);

    if (!first.ok || !second.ok) {
      toast({
        title: "Could not reorder links",
        description: first.message || second.message || "Please try again.",
        variant: "destructive",
      });
      return;
    }

    setLinks((current) =>
      sortSmartLinks(
        current.map((item) => {
          if (item.id === link.id) return linkWithPatch(item, { sortOrder: otherOrder });
          if (item.id === other.id) return linkWithPatch(item, { sortOrder: linkOrder });
          return item;
        })
      )
    );
    router.refresh();
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif">Smart Links</h1>
          <p className="text-muted-foreground mt-1">Manage identity accounts and public action links.</p>
        </div>
        <Button onClick={openCreateDialog} data-testid="btn-add-link">
          <Plus className="w-4 h-4 mr-2" /> Add Link
        </Button>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-medium">Social Links</h2>
          <p className="text-sm text-muted-foreground">Identity accounts shown as icons in the public profile header.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {SOCIAL_PLATFORMS.map((platform) => (
            <div key={platform.id} className="space-y-2">
              <Label htmlFor={`social-${platform.id}`}>{platform.label}</Label>
              <Input
                id={`social-${platform.id}`}
                value={socialUrls[platform.id] || ""}
                placeholder={platform.placeholder}
                onChange={(event) =>
                  setSocialUrls((current) => ({
                    ...current,
                    [platform.id]: event.target.value,
                  }))
                }
                data-testid={`input-social-${platform.id}`}
              />
            </div>
          ))}
        </div>
        <Button onClick={handleSaveSocialLinks} disabled={savingSocial} data-testid="btn-save-social-links">
          {savingSocial ? "Saving..." : "Save Social Links"}
        </Button>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-medium">Public Smart Links</h2>
            <p className="text-sm text-muted-foreground">{totalClicks} total clicks tracked through Smart Links.</p>
          </div>
        </div>

        {links.length === 0 ? (
          <EmptyState
            icon={<LinkIcon className="w-6 h-6" />}
            title="No smart links yet"
            description="Add links to consultations, files, demos, newsletters, or featured resources."
            action={
              <Button onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" /> Add Link
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {links.map((link, index) => {
              const imageUrl = link.thumbnailUrl || link.imageUrl || "";
              const hasImage = imageUrl && !failedImages.has(link.id);
              return (
                <div
                  key={link.id}
                  className="flex items-center gap-4 p-4 border rounded-xl bg-card hover:border-primary/50 transition-colors"
                  data-testid={`link-row-${link.id}`}
                >
                  <div className="text-muted-foreground">
                    <GripVertical className="w-5 h-5" />
                  </div>

                  <div className="w-14 h-14 shrink-0 rounded-md overflow-hidden bg-muted grid place-items-center">
                    {hasImage ? (
                      <img
                        src={imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={() => {
                          console.warn("image_load_failed", { link_id: link.id });
                          setFailedImages((current) => new Set(current).add(link.id));
                        }}
                      />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-foreground truncate">{link.title}</h3>
                      {link.isFeatured && (
                        <Badge variant="secondary" className="gap-1">
                          <Star className="w-3 h-3" /> Featured
                        </Badge>
                      )}
                      {link.category && <Badge variant="outline">{link.category}</Badge>}
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    {link.description && <p className="text-sm text-muted-foreground truncate mt-0.5">{link.description}</p>}
                    <p className="text-sm text-muted-foreground truncate">{link.url}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="bg-muted px-2 py-0.5 rounded">{link.clickCount || 0} clicks</span>
                      {link.lastClickedAt && <span>Last clicked {new Date(link.lastClickedAt).toLocaleDateString()}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Active</span>
                      <Switch checked={link.isActive} onCheckedChange={(checked) => patchSmartLink(link, { isActive: checked })} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Featured</span>
                      <Switch checked={Boolean(link.isFeatured)} onCheckedChange={(checked) => patchSmartLink(link, { isFeatured: checked })} />
                    </div>
                    <div className="flex items-center gap-1 border-l pl-4 ml-1">
                      <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => moveLink(link, -1)} disabled={index === 0} title="Move up">
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => moveLink(link, 1)} disabled={index === links.length - 1} title="Move down">
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => openEditDialog(link)} title="Edit link">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(link)}
                        title="Delete link"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingLink ? "Edit Smart Link" : "Create Smart Link"}</DialogTitle>
            <DialogDescription>Smart Links are the primary public action links on your profile.</DialogDescription>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="link-title">Title</Label>
              <Input id="link-title" value={form.title} onChange={(event) => updateForm("title", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-url">URL</Label>
              <Input id="link-url" value={form.url} placeholder="https://" onChange={(event) => updateForm("url", event.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="link-description">Description</Label>
              <Textarea
                id="link-description"
                value={form.description}
                rows={3}
                onChange={(event) => updateForm("description", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-icon">Icon</Label>
              <Input id="link-icon" value={form.icon} placeholder="calendar, file, demo" onChange={(event) => updateForm("icon", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-category">Category</Label>
              <Input id="link-category" value={form.category} placeholder="Consulting, Resume, Demo" onChange={(event) => updateForm("category", event.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="link-thumbnail">Thumbnail/Image URL</Label>
              <Input id="link-thumbnail" value={form.thumbnailUrl} placeholder="https://" onChange={(event) => updateForm("thumbnailUrl", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-sort">Sort Order</Label>
              <Input
                id="link-sort"
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(event) => updateForm("sortOrder", Number(event.target.value))}
              />
            </div>
            <div className="flex items-center gap-6 pt-6">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.isActive} onCheckedChange={(checked) => updateForm("isActive", checked)} />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.isFeatured} onCheckedChange={(checked) => updateForm("isFeatured", checked)} />
                Featured
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveSmartLink} disabled={saving}>
              {saving ? "Saving..." : editingLink ? "Save Link" : "Create Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
