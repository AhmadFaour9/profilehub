import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, profilesTable, linksTable, projectsTable, servicesTable, galleryTable } from "@workspace/db";
import {
  GetPublicProfileParams,
  GetPublicProfileResponse,
  GetMyProfileResponse,
  UpdateMyProfileBody,
  UpdateMyProfileResponse,
  PublishProfileBody,
  PublishProfileResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/profiles/:username", async (req, res): Promise<void> => {
  const params = GetPublicProfileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.username, params.data.username));

  if (!profile || !profile.isPublished) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const links = await db
    .select()
    .from(linksTable)
    .where(eq(linksTable.profileId, profile.id));

  const projects = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.profileId, profile.id));

  const services = await db
    .select()
    .from(servicesTable)
    .where(eq(servicesTable.profileId, profile.id));

  const gallery = await db
    .select()
    .from(galleryTable)
    .where(eq(galleryTable.profileId, profile.id));

  const publicProfile = {
    username: profile.username,
    displayName: profile.displayName,
    profession: profile.profession,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    coverUrl: profile.coverUrl,
    location: profile.location,
    socialLinks: profile.socialLinks,
    links: links.filter((l) => l.isActive).sort((a, b) => a.order - b.order),
    projects: projects.sort((a, b) => a.order - b.order),
    services: services.filter((s) => s.isActive).sort((a, b) => a.order - b.order),
    gallery: gallery.sort((a, b) => a.order - b.order),
    theme: profile.theme,
  };

  res.json(GetPublicProfileResponse.parse(publicProfile));
});

router.get("/me/profile", async (req, res): Promise<void> => {
  const profileId = "demo-user";
  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, profileId));

  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  res.json(GetMyProfileResponse.parse({
    ...profile,
    socialLinks: profile.socialLinks as unknown[],
    theme: profile.theme as Record<string, unknown>,
  }));
});

router.patch("/me/profile", async (req, res): Promise<void> => {
  const parsed = UpdateMyProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const profileId = "demo-user";
  const [profile] = await db
    .update(profilesTable)
    .set(parsed.data as Partial<typeof profilesTable.$inferInsert>)
    .where(eq(profilesTable.id, profileId))
    .returning();

  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  res.json(UpdateMyProfileResponse.parse({
    ...profile,
    socialLinks: profile.socialLinks as unknown[],
    theme: profile.theme as Record<string, unknown>,
  }));
});

router.post("/me/publish", async (req, res): Promise<void> => {
  const parsed = PublishProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const profileId = "demo-user";
  const [profile] = await db
    .update(profilesTable)
    .set({ isPublished: parsed.data.isPublished })
    .where(eq(profilesTable.id, profileId))
    .returning();

  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  res.json(PublishProfileResponse.parse({
    ...profile,
    socialLinks: profile.socialLinks as unknown[],
    theme: profile.theme as Record<string, unknown>,
  }));
});

export default router;
