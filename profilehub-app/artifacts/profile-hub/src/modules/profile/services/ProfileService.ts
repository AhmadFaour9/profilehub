import type { IProfileRepository, ILinkRepository, IProjectRepository } from "../domain/interfaces";
import { auditLog } from "@/modules/logging";
import type { Profile, Link, Project, Service, GalleryItem } from "@/modules/shared";

export class ProfileService {
  constructor(
    private profileRepo: IProfileRepository,
    private linkRepo: ILinkRepository,
    private projectRepo: IProjectRepository,
    private currentUserId?: string
  ) {}

  private async requireOwnership(profileId: string) {
    if (!this.currentUserId) throw new Error("Unauthorized");
    const profile = await this.profileRepo.getProfileByUserId(this.currentUserId);
    if (!profile || profile.id !== profileId) {
      throw new Error("Unauthorized access to profile resources");
    }
    return profile;
  }

  async getProfile(username: string): Promise<Profile | null> {
    return this.profileRepo.getProfileByUsername(username);
  }

  async getMyProfile(): Promise<Profile | null> {
    if (!this.currentUserId) return null;
    return this.profileRepo.getProfileByUserId(this.currentUserId);
  }

  async getMyProfileContent() {
    const profile = await this.getMyProfile();
    if (!profile) return null;

    const [links, projects, services, media] = await Promise.all([
      this.linkRepo.getLinksByProfileId(profile.id),
      this.projectRepo.getProjectsByProfileId(profile.id),
      this.profileRepo.getServicesByProfileId(profile.id),
      this.profileRepo.getMediaByProfileId(profile.id),
    ]);

    return { profile, links, projects, services, media };
  }

  async updateProfile(id: string, data: Partial<Profile>): Promise<Profile> {
    await this.requireOwnership(id);
    const updated = await this.profileRepo.updateProfile(id, data);
    await auditLog({ userId: this.currentUserId!, action: "update", entityType: "profile", entityId: id, metadata: data });
    return updated;
  }

  // Links
  async createLink(profileId: string, data: Partial<Link>): Promise<Link> {
    await this.requireOwnership(profileId);
    const link = await this.linkRepo.createLink({ ...data, profileId });
    await auditLog({ userId: this.currentUserId!, action: "create", entityType: "link", entityId: link.id });
    return link;
  }

  async updateLink(id: string, profileId: string, data: Partial<Link>): Promise<Link> {
    await this.requireOwnership(profileId);
    const link = await this.linkRepo.updateLink(id, profileId, data);
    await auditLog({ userId: this.currentUserId!, action: "update", entityType: "link", entityId: id });
    return link;
  }

  async deleteLink(id: string, profileId: string): Promise<void> {
    await this.requireOwnership(profileId);
    await this.linkRepo.deleteLink(id, profileId);
    await auditLog({ userId: this.currentUserId!, action: "delete", entityType: "link", entityId: id });
  }

  // Projects
  async createProject(profileId: string, data: Partial<Project>): Promise<Project> {
    await this.requireOwnership(profileId);
    const project = await this.projectRepo.createProject({ ...data, profileId });
    await auditLog({ userId: this.currentUserId!, action: "create", entityType: "project", entityId: project.id });
    return project;
  }

  async updateProject(id: string, profileId: string, data: Partial<Project>): Promise<Project> {
    await this.requireOwnership(profileId);
    const project = await this.projectRepo.updateProject(id, profileId, data);
    await auditLog({ userId: this.currentUserId!, action: "update", entityType: "project", entityId: id });
    return project;
  }

  async deleteProject(id: string, profileId: string): Promise<void> {
    await this.requireOwnership(profileId);
    await this.projectRepo.deleteProject(id, profileId);
    await auditLog({ userId: this.currentUserId!, action: "delete", entityType: "project", entityId: id });
  }

  // Services
  async createService(profileId: string, data: Partial<Service>): Promise<Service> {
    await this.requireOwnership(profileId);
    const service = await this.profileRepo.createService({ ...data, profileId });
    await auditLog({ userId: this.currentUserId!, action: "create", entityType: "service", entityId: service.id });
    return service;
  }

  async updateService(id: string, profileId: string, data: Partial<Service>): Promise<Service> {
    await this.requireOwnership(profileId);
    const service = await this.profileRepo.updateService(id, profileId, data);
    await auditLog({ userId: this.currentUserId!, action: "update", entityType: "service", entityId: id });
    return service;
  }

  async deleteService(id: string, profileId: string): Promise<void> {
    await this.requireOwnership(profileId);
    await this.profileRepo.deleteService(id, profileId);
    await auditLog({ userId: this.currentUserId!, action: "delete", entityType: "service", entityId: id });
  }

  // Media
  async addMedia(profileId: string, data: Partial<GalleryItem>): Promise<GalleryItem> {
    await this.requireOwnership(profileId);
    const media = await this.profileRepo.addMedia({ ...data, profileId });
    await auditLog({ userId: this.currentUserId!, action: "create", entityType: "media", entityId: media.id });
    return media;
  }

  async deleteMedia(id: string, profileId: string): Promise<void> {
    await this.requireOwnership(profileId);
    await this.profileRepo.deleteMedia(id, profileId);
    await auditLog({ userId: this.currentUserId!, action: "delete", entityType: "media", entityId: id });
  }

  // Theme
  async updateTheme(profileId: string, tokens: Record<string, unknown>): Promise<any> {
    await this.requireOwnership(profileId);
    const theme = await this.profileRepo.upsertTheme(profileId, "custom", tokens);
    await auditLog({ userId: this.currentUserId!, action: "update", entityType: "theme", entityId: theme.id });
    return theme;
  }
}
