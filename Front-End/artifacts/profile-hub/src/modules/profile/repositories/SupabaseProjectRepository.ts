import type { SupabaseClient } from "@supabase/supabase-js";
import type { IProjectRepository } from "../domain/interfaces";
import type { Project } from "@/modules/shared";

const mapProject = (row: any): Project => ({
  id: row.id,
  profileId: row.profile_id,
  title: row.title,
  description: row.description,
  imageUrl: row.image_url,
  projectUrl: row.project_url,
  repoUrl: row.repo_url,
  url: row.project_url,
  tags: row.tags || [],
  position: row.position,
  order: row.position,
  isFeatured: row.is_featured,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class SupabaseProjectRepository implements IProjectRepository {
  constructor(private client: SupabaseClient) {}

  async getProjectsByProfileId(profileId: string): Promise<Project[]> {
    const { data, error } = await this.client
      .from("projects")
      .select("*")
      .eq("profile_id", profileId)
      .order("position");

    if (error) throw new Error(error.message);
    return (data || []).map(mapProject);
  }

  async createProject(data: Partial<Project>): Promise<Project> {
    const { data: result, error } = await this.client
      .from("projects")
      .insert({
        profile_id: data.profileId,
        title: data.title,
        description: data.description,
        image_url: data.imageUrl,
        project_url: data.projectUrl,
        repo_url: data.repoUrl,
        tags: data.tags,
        position: data.position,
        is_featured: data.isFeatured ?? false,
        is_active: data.isActive ?? true,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return mapProject(result);
  }

  async updateProject(id: string, profileId: string, data: Partial<Project>): Promise<Project> {
    const payload: any = {};
    if (data.title !== undefined) payload.title = data.title;
    if (data.description !== undefined) payload.description = data.description;
    if (data.imageUrl !== undefined) payload.image_url = data.imageUrl;
    if (data.projectUrl !== undefined) payload.project_url = data.projectUrl;
    if (data.repoUrl !== undefined) payload.repo_url = data.repoUrl;
    if (data.tags !== undefined) payload.tags = data.tags;
    if (data.position !== undefined) payload.position = data.position;
    if (data.isFeatured !== undefined) payload.is_featured = data.isFeatured;
    if (data.isActive !== undefined) payload.is_active = data.isActive;

    const { data: result, error } = await this.client
      .from("projects")
      .update(payload)
      .eq("id", id)
      .eq("profile_id", profileId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return mapProject(result);
  }

  async deleteProject(id: string, profileId: string): Promise<void> {
    const { error } = await this.client
      .from("projects")
      .delete()
      .eq("id", id)
      .eq("profile_id", profileId);

    if (error) throw new Error(error.message);
  }
}
