import { Router, type IRouter } from "express";
import healthRouter from "./health";
import jnxRouter from "./jnx";

const router: IRouter = Router();

router.use(healthRouter);
router.use(jnxRouter);

export default router;
