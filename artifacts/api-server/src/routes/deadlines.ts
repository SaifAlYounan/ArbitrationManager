import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, deadlinesTable } from "@workspace/db";
import {
  ListDeadlinesParams,
  ListDeadlinesResponse,
  AddDeadlineParams,
  AddDeadlineBody,
  UpdateDeadlineParams,
  UpdateDeadlineBody,
  UpdateDeadlineResponse,
  DeleteDeadlineParams,
} from "@workspace/api-zod";

function coerceDates(body: any) {
  const result = { ...body };
  if (typeof result.dueDate === "string") result.dueDate = new Date(result.dueDate);
  if (typeof result.originalDueDate === "string") result.originalDueDate = new Date(result.originalDueDate);
  else if (result.originalDueDate === null || result.originalDueDate === undefined) result.originalDueDate = null;
  return result;
}

function dateToString(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d instanceof Date ? d.toISOString().split("T")[0] : d;
}

function flattenDeadlineBody(parsed: any): any {
  return {
    ...parsed,
    dueDate: dateToString(parsed.dueDate) ?? parsed.dueDate,
    originalDueDate: parsed.originalDueDate ? dateToString(parsed.originalDueDate) : null,
  };
}

const router: IRouter = Router();

router.get("/cases/:caseId/deadlines", async (req, res): Promise<void> => {
  const params = ListDeadlinesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const deadlines = await db
    .select()
    .from(deadlinesTable)
    .where(eq(deadlinesTable.caseId, params.data.caseId))
    .orderBy(deadlinesTable.dueDate);
  res.json(deadlines);
});

router.post("/cases/:caseId/deadlines", async (req, res): Promise<void> => {
  const params = AddDeadlineParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = AddDeadlineBody.safeParse(coerceDates(req.body));
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const values = flattenDeadlineBody(parsed.data);
  const [deadline] = await db
    .insert(deadlinesTable)
    .values({ ...values, caseId: params.data.caseId })
    .returning();
  res.status(201).json(deadline);
});

router.put("/cases/:caseId/deadlines/:deadlineId", async (req, res): Promise<void> => {
  const params = UpdateDeadlineParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateDeadlineBody.safeParse(coerceDates(req.body));
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const values = flattenDeadlineBody(parsed.data);
  const [updated] = await db
    .update(deadlinesTable)
    .set(values)
    .where(
      and(
        eq(deadlinesTable.id, params.data.deadlineId),
        eq(deadlinesTable.caseId, params.data.caseId)
      )
    )
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Deadline not found" });
    return;
  }
  res.json(updated);
});

router.delete("/cases/:caseId/deadlines/:deadlineId", async (req, res): Promise<void> => {
  const params = DeleteDeadlineParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(deadlinesTable)
    .where(
      and(
        eq(deadlinesTable.id, params.data.deadlineId),
        eq(deadlinesTable.caseId, params.data.caseId)
      )
    )
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Deadline not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
