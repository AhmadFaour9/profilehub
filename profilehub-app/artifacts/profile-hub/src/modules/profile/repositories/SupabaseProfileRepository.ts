import type { SupabaseClient } from "@supabase/supabase-js";
import type { IProfileRepository } from "../domain/interfaces";
import type { Profile, Service, GalleryItem } from "@/modules/shared";

// Basic mapping function
const mapProfile = (row: any): Profile => ({
  id: row.id,
  userId: row.user_id,
  username: row.username,
  displayName: row.display_name,
  title: row.title,
  profession: row.title,
  bio: row.bio,
  avatarUrl: row.avatar_url,
  coverUrl: row.cover_url,
  location: row.location,
  website: row.website,
  themeId: row.theme_id,
  isPublished: row.is_published,
  seoTitle: row.seo_title,
  seoDescription: row.seo_description,
  theme: row.theme ? { id: row.theme.id, ...row.theme.tokens } : { id: "default" },
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapService = (row: any): Service => ({
  id: row.id,
  profileId: row.profile_id,
  title: row.title,
  description: row.description,
  priceLabel: row.price_label,
  price: row.price_label,
  ctaLabel: row.cta_label,
  ctaUrl: row.cta_url,
  position: row.position,
  order: row.position,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapMedia = (row: any): GalleryItem => ({
  id: row.id,
  profileId: row.profile_id,
  url: row.url,
  imageUrl: row.url,
  alt: row.alt,
  caption: row.alt,
  type: row.type,
  position: row.position,
  order: row.position,
  createdAt: row.created_at,
});

export class SupabaseProfileRepository implements IProfileRepository {
  constructor(private client: SupabaseClient) {}

  async getProfileByUserId(userId: string): Promise<Profile | null> {
    const { data, error } = await this.client
      .from("profiles")
      .select("*, theme:themes(*)")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) return null;
    return mapProfile(data);
  }

  async getProfileByUsername(username: string): Promise<Profile | null> {
    const { data, error } = await this.client
      .from("profiles")
      .select("*, theme:themes(*)")
      .eq("username", username)
      .maybeSingle();

    if (error || !data) return null;
    return mapProfile(data);
  }

  async checkUsernameExists(username: string): Promise<boolean> {
    const { data, error } = await this.client
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();
      
    if (error && error.code !== "PGRST116") {
        return true; // fail safe
    }
    return !!data;
  }

  async createProfile(data: Partial<Profile>): Promise<Profile> {
    const payload = {
      user_id: data.userId,
      username: data.username,
      display_name: data.displayName,
      title: data.title,
      bio: data.bio,
      is_published: data.isPublished,
    };

    const { data: result, error } = await this.client
      .from("profiles")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return mapProfile(result);
  }

  async updateProfile(id: string, data: Partial<Profile>): Promise<Profile> {
    const payload: any = {};
    if (data.displayName !== undefined) payload.display_name = data.displayName;
    if (data.username !== undefined) payload.username = data.username;
    if (data.title !== undefined) payload.title = data.title;
    if (data.bio !== undefined) payload.bio = data.bio;
    if (data.location !== undefined) payload.location = data.location;
    if (data.website !== undefined) payload.website = data.website;
    if (data.isPublished !== undefined) payload.is_published = data.isPublished;
    if (data.avatarUrl !== undefined) payload.avatar_url = data.avatarUrl;
    if (data.coverUrl !== undefined) payload.cover_url = data.coverUrl;
    if (data.seoTitle !== undefined) payload.seo_title = data.seoTitle;
    if (data.seoDescription !== undefined) payload.seo_description = data.seoDescription;

    const { data: result, error } = await this.client
      .from("profiles")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return mapProfile(result);
  }

  async getServicesByProfileId(profileId: string): Promise<Service[]> {
    const { data, error } = await this.client
      .from("services")
      .select("*")
      .eq("profile_id", profileId)
      .order("position");
    
    if (error) throw new Error(error.message);
    return (data || []).map(mapService);
  }

  async createService(data: Partial<Service>): Promise<Service> {
    const { data: result, error } = await this.client
      .from("services")
      .insert({
        profile_id: data.profileId,
        title: data.title,
        description: data.description,
        price_label: data.priceLabel,
        cta_label: data.ctaLabel,
        cta_url: data.ctaUrl,
        position: data.position,
        is_active: data.isActive ?? true,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapService(result);
  }

  async updateService(id: string, profileId: string, data: Partial<Service>): Promise<Service> {
    const payload: any = {};
    if (data.title !== undefined) payload.title = data.title;
    if (data.description !== undefined) payload.description = data.description;
    if (data.priceLabel !== undefined) payload.price_label = data.priceLabel;
    if (data.ctaLabel !== undefined) payload.cta_label = data.ctaLabel;
    if (data.ctaUrl !== undefined) payload.cta_url = data.ctaUrl;
    if (data.position !== undefined) payload.position = data.position;
    if (data.isActive !== undefined) payload.is_active = data.isActive;

    const { data: result, error } = await this.client
      .from("services")
      .update(payload)
      .eq("id", id)
      .eq("profile_id", profileId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapService(result);
  }

  async deleteService(id: string, profileId: string): Promise<void> {
    const { error } = await this.client.from("services").delete().eq("id", id).eq("profile_id", profileId);
    if (error) throw new Error(error.message);
  }

  async getMediaByProfileId(profileId: string): Promise<GalleryItem[]> {
    const { data, error } = await this.client
      .from("media")
      .select("*")
      .eq("profile_id", profileId)
      .order("position");
    
    if (error) throw new Error(error.message);
    return (data || []).map(mapMedia);
  }

  async addMedia(data: Partial<GalleryItem>): Promise<GalleryItem> {
    const { data: result, error } = await this.client
      .from("media")
      .insert({
        profile_id: data.profileId,
        url: data.url,
        alt: data.alt,
        type: data.type || "image",
        position: data.position || 0,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapMedia(result);
  }

  async deleteMedia(id: string, profileId: string): Promise<void> {
    const { error } = await this.client.from("media").delete().eq("id", id).eq("profile_id", profileId);
    if (error) throw new Error(error.message);
  }

  async upsertTheme(profileId: string, name: string, tokens: Record<string, unknown>): Promise<any> {
    const { data: existing } = await this.client.from("themes").select("id").eq("profile_id", profileId).maybeSingle();
    const payload = { profile_id: profileId, name, tokens };
    
    let result, error;
    if (existing) {
      ({ data: result, error } = await this.client.from("themes").update(payload).eq("id", existing.id).select("*").single());
    } else {
      ({ data: result, error } = await this.client.from("themes").insert(payload).select("*").single());
    }

    if (error) throw new Error(error.message);
    await this.client.from("profiles").update({ theme_id: result.id }).eq("id", profileId);
    return result;
  }
}
