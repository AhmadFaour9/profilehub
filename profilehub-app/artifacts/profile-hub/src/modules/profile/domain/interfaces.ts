import type { Profile, Link, Project, Service, GalleryItem } from "@/modules/shared";

export interface IProfileRepository {
  getProfileByUserId(userId: string): Promise<Profile | null>;
  getProfileByUsername(username: string): Promise<Profile | null>;
  checkUsernameExists(username: string): Promise<boolean>;
  createProfile(data: Partial<Profile>): Promise<Profile>;
  updateProfile(id: string, data: Partial<Profile>): Promise<Profile>;
  getServicesByProfileId(profileId: string): Promise<Service[]>;
  createService(data: Partial<Service>): Promise<Service>;
  updateService(id: string, profileId: string, data: Partial<Service>): Promise<Service>;
  deleteService(id: string, profileId: string): Promise<void>;
  getMediaByProfileId(profileId: string): Promise<GalleryItem[]>;
  addMedia(data: Partial<GalleryItem>): Promise<GalleryItem>;
  deleteMedia(id: string, profileId: string): Promise<void>;
  upsertTheme(profileId: string, name: string, tokens: Record<string, unknown>): Promise<any>;
}

export interface ILinkRepository {
  getLinksByProfileId(profileId: string): Promise<Link[]>;
  createLink(data: Partial<Link>): Promise<Link>;
  updateLink(id: string, profileId: string, data: Partial<Link>): Promise<Link>;
  deleteLink(id: string, profileId: string): Promise<void>;
}

export interface IProjectRepository {
  getProjectsByProfileId(profileId: string): Promise<Project[]>;
  createProject(data: Partial<Project>): Promise<Project>;
  updateProject(id: string, profileId: string, data: Partial<Project>): Promise<Project>;
  deleteProject(id: string, profileId: string): Promise<void>;
}
