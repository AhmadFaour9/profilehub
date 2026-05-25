import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, galleryTable } from "@workspace/db";
import {
  GetMyGalleryResponse,
  CreateGalleryItemBody,
  DeleteGalleryItemParams,
} from "@workspace/api-zod";
import { randomUUID } from "crypto";

const router: IRouter = Router();

const DEMO_PROFILE_ID = "demo-user";

router.get("/me/gallery", async (_req, res): Promise<void> => {
  const items = await db
    .select()
    .from(galleryTable)
    .where(eq(galleryTable.profileId, DEMO_PROFILE_ID));

  res.json(GetMyGalleryResponse.parse(items.sort((a, b) => a.order - b.order)));
});

router.post("/me/gallery", async (req, res): Promise<void> => {
  const parsed = CreateGalleryItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db
    .select()
    .from(galleryTable)
    .where(eq(galleryTable.profileId, DEMO_PROFILE_ID));

  const [item] = await db
    .insert(galleryTable)
    .values({
      id: randomUUID(),
      profileId: DEMO_PROFILE_ID,
      ...parsed.data,
      order: existing.length,
    })
    .returning();

  res.status(201).json(item);
});

router.delete("/me/gallery/:id", async (req, res): Promise<void> => {
  const params = DeleteGalleryItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const [item] = await db
    .delete(galleryTable)
    .where(eq(galleryTable.id, rawId))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Gallery item not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
