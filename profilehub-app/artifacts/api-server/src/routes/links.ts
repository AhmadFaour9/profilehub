import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, linksTable } from "@workspace/db";
import {
  GetMyLinksResponse,
  CreateLinkBody,
  UpdateLinkParams,
  UpdateLinkBody,
  UpdateLinkResponse,
  DeleteLinkParams,
  ReorderLinksBody,
  ReorderLinksResponse,
} from "@workspace/api-zod";
import { randomUUID } from "crypto";

const router: IRouter = Router();

const DEMO_PROFILE_ID = "demo-user";

router.get("/me/links", async (_req, res): Promise<void> => {
  const links = await db
    .select()
    .from(linksTable)
    .where(eq(linksTable.profileId, DEMO_PROFILE_ID));

  res.json(GetMyLinksResponse.parse(links.sort((a, b) => a.order - b.order)));
});

router.post("/me/links", async (req, res): Promise<void> => {
  const parsed = CreateLinkBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existingLinks = await db
    .select()
    .from(linksTable)
    .where(eq(linksTable.profileId, DEMO_PROFILE_ID));

  const [link] = await db
    .insert(linksTable)
    .values({
      id: randomUUID(),
      profileId: DEMO_PROFILE_ID,
      ...parsed.data,
      isActive: parsed.data.isActive ?? true,
      isPinned: parsed.data.isPinned ?? false,
      order: existingLinks.length,
      clickCount: 0,
    })
    .returning();

  res.status(201).json(link);
});

router.patch("/me/links/:id", async (req, res): Promise<void> => {
  const params = UpdateLinkParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateLinkBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const [link] = await db
    .update(linksTable)
    .set(parsed.data)
    .where(eq(linksTable.id, rawId))
    .returning();

  if (!link) {
    res.status(404).json({ error: "Link not found" });
    return;
  }

  res.json(UpdateLinkResponse.parse(link));
});

router.delete("/me/links/:id", async (req, res): Promise<void> => {
  const params = DeleteLinkParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const [link] = await db
    .delete(linksTable)
    .where(eq(linksTable.id, rawId))
    .returning();

  if (!link) {
    res.status(404).json({ error: "Link not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/me/links/reorder", async (req, res): Promise<void> => {
  const parsed = ReorderLinksBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await Promise.all(
    parsed.data.ids.map((id, index) =>
      db.update(linksTable).set({ order: index }).where(eq(linksTable.id, id))
    )
  );

  const links = await db
    .select()
    .from(linksTable)
    .where(eq(linksTable.profileId, DEMO_PROFILE_ID));

  res.json(ReorderLinksResponse.parse(links.sort((a, b) => a.order - b.order)));
});

export default router;
