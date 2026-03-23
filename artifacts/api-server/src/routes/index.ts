import { Router, type IRouter } from "express";
import healthRouter from "./health";
import casesRouter from "./cases";
import deadlinesRouter from "./deadlines";

const router: IRouter = Router();

router.use(healthRouter);
router.use(casesRouter);
router.use(deadlinesRouter);

export default router;
