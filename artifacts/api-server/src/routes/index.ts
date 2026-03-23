import { Router, type IRouter } from "express";
import healthRouter from "./health";
import casesRouter from "./cases";
import deadlinesRouter from "./deadlines";
import proceduralOrdersRouter from "./proceduralOrders";
import hearingsRouter from "./hearings";
import costsRouter from "./costs";
import exhibitsRouter from "./exhibits";
import activityRouter from "./activity";
import searchRouter from "./search";
import preferencesRouter from "./preferences";

const router: IRouter = Router();

router.use(healthRouter);
router.use(casesRouter);
router.use(deadlinesRouter);
router.use(proceduralOrdersRouter);
router.use(hearingsRouter);
router.use(costsRouter);
router.use(exhibitsRouter);
router.use(activityRouter);
router.use(searchRouter);
router.use(preferencesRouter);

export default router;
