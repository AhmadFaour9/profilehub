import type { SupabaseClient } from "@supabase/supabase-js";
import type { ILinkRepository } from "../domain/interfaces";
import type { Link } from "@/modules/shared";

const mapLink = (row: any): Link => ({
  id: row.id,
  profileId: row.profile_id,
  title: row.title,
  url: row.url,
  description: row.description,
  icon: row.icon,
  thumbnailUrl: row.image_url,
  imageUrl: row.image_url,
  category: row.category,
  type: row.category,
  position: row.sort_order,
  order: row.sort_order,
  sortOrder: row.sort_order,
  isActive: row.is_active,
  isFeatured: row.is_featured,
  clickCount: row.click_count || 0,
  lastClickedAt: row.last_clicked_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class SupabaseLinkRepository implements ILinkRepository {
  constructor(private client: SupabaseClient) {}

  async getLinksByProfileId(profileId: string): Promise<Link[]> {
    const { data, error } = await this.client
      .from("smart_links")
      .select("*")
      .eq("profile_id", profileId)
      .order("sort_order");

    if (error) {
      console.warn(`[SupabaseLinkRepository] getLinksByProfileId error:`, error.message);
      return [];
    }
    return (data || []).map(mapLink);
  }

  async createLink(data: Partial<Link>): Promise<Link> {
    const { data: result, error } = await this.client
      .from("smart_links")
      .insert({
        profile_id: data.profileId,
        title: data.title,
        url: data.url,
        description: data.description,
        icon: data.icon,
        image_url: data.thumbnailUrl || data.imageUrl || null,
        category: data.category || data.type || null,
        is_featured: data.isFeatured ?? false,
        sort_order: data.sortOrder ?? data.position ?? 0,
        is_active: data.isActive ?? true,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return mapLink(result);
  }

  async updateLink(id: string, profileId: string, data: Partial<Link>): Promise<Link> {
    const payload: any = {};
    if (data.title !== undefined) payload.title = data.title;
    if (data.url !== undefined) payload.url = data.url;
    if (data.description !== undefined) payload.description = data.description;
    if (data.icon !== undefined) payload.icon = data.icon;
    if (data.thumbnailUrl !== undefined) payload.image_url = data.thumbnailUrl || null;
    if (data.imageUrl !== undefined) payload.image_url = data.imageUrl || null;
    if (data.category !== undefined) payload.category = data.category || null;
    if (data.type !== undefined) payload.category = data.type || null;
    if (data.position !== undefined) payload.sort_order = data.position;
    if (data.sortOrder !== undefined) payload.sort_order = data.sortOrder;
    if (data.isFeatured !== undefined) payload.is_featured = data.isFeatured;
    if (data.isActive !== undefined) payload.is_active = data.isActive;

    const { data: result, error } = await this.client
      .from("smart_links")
      .update(payload)
      .eq("id", id)
      .eq("profile_id", profileId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return mapLink(result);
  }

  async deleteLink(id: string, profileId: string): Promise<void> {
    const { error } = await this.client
      .from("smart_links")
      .delete()
      .eq("id", id)
      .eq("profile_id", profileId);

    if (error) throw new Error(error.message);
  }
}
