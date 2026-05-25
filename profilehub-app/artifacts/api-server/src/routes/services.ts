import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, servicesTable } from "@workspace/db";
import {
  GetMyServicesResponse,
  CreateServiceBody,
  UpdateServiceParams,
  UpdateServiceBody,
  UpdateServiceResponse,
  DeleteServiceParams,
} from "@workspace/api-zod";
import { randomUUID } from "crypto";

const router: IRouter = Router();

const DEMO_PROFILE_ID = "demo-user";

router.get("/me/services", async (_req, res): Promise<void> => {
  const services = await db
    .select()
    .from(servicesTable)
    .where(eq(servicesTable.profileId, DEMO_PROFILE_ID));

  res.json(GetMyServicesResponse.parse(services.sort((a, b) => a.order - b.order)));
});

router.post("/me/services", async (req, res): Promise<void> => {
  const parsed = CreateServiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db
    .select()
    .from(servicesTable)
    .where(eq(servicesTable.profileId, DEMO_PROFILE_ID));

  const [service] = await db
    .insert(servicesTable)
    .values({
      id: randomUUID(),
      profileId: DEMO_PROFILE_ID,
      ...parsed.data,
      isActive: parsed.data.isActive ?? true,
      order: existing.length,
    })
    .returning();

  res.status(201).json(service);
});

router.patch("/me/services/:id", async (req, res): Promise<void> => {
  const params = UpdateServiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateServiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const [service] = await db
    .update(servicesTable)
    .set(parsed.data)
    .where(eq(servicesTable.id, rawId))
    .returning();

  if (!service) {
    res.status(404).json({ error: "Service not found" });
    return;
  }

  res.json(UpdateServiceResponse.parse(service));
});

router.delete("/me/services/:id", async (req, res): Promise<void> => {
  const params = DeleteServiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const [service] = await db
    .delete(servicesTable)
    .where(eq(servicesTable.id, rawId))
    .returning();

  if (!service) {
    res.status(404).json({ error: "Service not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
