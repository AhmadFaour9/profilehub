import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, projectsTable } from "@workspace/db";
import {
  GetMyProjectsResponse,
  CreateProjectBody,
  UpdateProjectParams,
  UpdateProjectBody,
  UpdateProjectResponse,
  DeleteProjectParams,
} from "@workspace/api-zod";
import { randomUUID } from "crypto";

const router: IRouter = Router();

const DEMO_PROFILE_ID = "demo-user";

router.get("/me/projects", async (_req, res): Promise<void> => {
  const projects = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.profileId, DEMO_PROFILE_ID));

  res.json(GetMyProjectsResponse.parse(projects.sort((a, b) => a.order - b.order)));
});

router.post("/me/projects", async (req, res): Promise<void> => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.profileId, DEMO_PROFILE_ID));

  const [project] = await db
    .insert(projectsTable)
    .values({
      id: randomUUID(),
      profileId: DEMO_PROFILE_ID,
      ...parsed.data,
      isFeatured: parsed.data.isFeatured ?? false,
      tags: parsed.data.tags ?? [],
      order: existing.length,
    })
    .returning();

  res.status(201).json(project);
});

router.patch("/me/projects/:id", async (req, res): Promise<void> => {
  const params = UpdateProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const [project] = await db
    .update(projectsTable)
    .set(parsed.data)
    .where(eq(projectsTable.id, rawId))
    .returning();

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.json(UpdateProjectResponse.parse(project));
});

router.delete("/me/projects/:id", async (req, res): Promise<void> => {
  const params = DeleteProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const [project] = await db
    .delete(projectsTable)
    .where(eq(projectsTable.id, rawId))
    .returning();

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
