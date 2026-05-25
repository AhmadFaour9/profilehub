import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profilesRouter from "./profiles";
import linksRouter from "./links";
import projectsRouter from "./projects";
import servicesRouter from "./services";
import galleryRouter from "./gallery";
import analyticsRouter from "./analytics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(profilesRouter);
router.use(linksRouter);
router.use(projectsRouter);
router.use(servicesRouter);
router.use(galleryRouter);
router.use(analyticsRouter);

export default router;
