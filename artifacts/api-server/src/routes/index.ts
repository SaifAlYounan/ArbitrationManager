import { Router, type IRouter } from "express";
import healthRouter from "./health";
import casesRouter from "./cases";
import deadlinesRouter from "./deadlines";
import proceduralOrdersRouter from "./proceduralOrders";
import hearingsRouter from "./hearings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(casesRouter);
router.use(deadlinesRouter);
router.use(proceduralOrdersRouter);
router.use(hearingsRouter);

export default router;
