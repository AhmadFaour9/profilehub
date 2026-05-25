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
  type: row.type,
  position: row.position,
  order: row.position,
  isActive: row.is_active,
  clickCount: row.click_count || 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class SupabaseLinkRepository implements ILinkRepository {
  constructor(private client: SupabaseClient) {}

  async getLinksByProfileId(profileId: string): Promise<Link[]> {
    const { data, error } = await this.client
      .from("links")
      .select("*")
      .eq("profile_id", profileId)
      .order("position");

    if (error) throw new Error(error.message);
    return (data || []).map(mapLink);
  }

  async createLink(data: Partial<Link>): Promise<Link> {
    const { data: result, error } = await this.client
      .from("links")
      .insert({
        profile_id: data.profileId,
        title: data.title,
        url: data.url,
        description: data.description,
        icon: data.icon,
        type: data.type,
        position: data.position,
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
    if (data.type !== undefined) payload.type = data.type;
    if (data.position !== undefined) payload.position = data.position;
    if (data.isActive !== undefined) payload.is_active = data.isActive;

    const { data: result, error } = await this.client
      .from("links")
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
      .from("links")
      .delete()
      .eq("id", id)
      .eq("profile_id", profileId);

    if (error) throw new Error(error.message);
  }
}
