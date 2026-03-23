import { Router, type IRouter } from "express";
import { eq, and, count } from "drizzle-orm";
import { db, proceduralOrdersTable, deadlinesTable } from "@workspace/db";
import {
  ListProceduralOrdersParams,
  AddProceduralOrderParams,
  AddProceduralOrderBody,
  UpdateProceduralOrderParams,
  UpdateProceduralOrderBody,
  DeleteProceduralOrderParams,
  ApplyPoToDeadlinesParams,
  ApplyPoToDeadlinesBody,
} from "@workspace/api-zod";

function coercePoDates(body: any) {
  const result = { ...body };
  if (typeof result.dateIssued === "string") result.dateIssued = new Date(result.dateIssued);
  return result;
}

function flattenPoBody(parsed: any): any {
  return {
    ...parsed,
    dateIssued: parsed.dateIssued instanceof Date
      ? parsed.dateIssued.toISOString().split("T")[0]
      : parsed.dateIssued,
  };
}

function coerceApplyBody(body: any) {
  return {
    updates: (body.updates ?? []).map((u: any) => ({
      deadlineId: u.deadlineId,
      newDueDate: typeof u.newDueDate === "string" ? new Date(u.newDueDate) : u.newDueDate,
    })),
  };
}

const router: IRouter = Router();

router.get("/cases/:caseId/procedural-orders", async (req, res): Promise<void> => {
  const params = ListProceduralOrdersParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const orders = await db
    .select()
    .from(proceduralOrdersTable)
    .where(eq(proceduralOrdersTable.caseId, params.data.caseId))
    .orderBy(proceduralOrdersTable.dateIssued);
  res.json(orders);
});

router.post("/cases/:caseId/procedural-orders", async (req, res): Promise<void> => {
  const params = AddProceduralOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = AddProceduralOrderBody.safeParse(coercePoDates(req.body));
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Auto-generate PO number based on existing count
  const [{ value: existingCount }] = await db
    .select({ value: count() })
    .from(proceduralOrdersTable)
    .where(eq(proceduralOrdersTable.caseId, params.data.caseId));
  const poNumber = `PO${Number(existingCount) + 1}`;

  const values = flattenPoBody(parsed.data);
  const [order] = await db
    .insert(proceduralOrdersTable)
    .values({ ...values, caseId: params.data.caseId, poNumber })
    .returning();
  res.status(201).json(order);
});

router.put("/cases/:caseId/procedural-orders/:poId", async (req, res): Promise<void> => {
  const params = UpdateProceduralOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateProceduralOrderBody.safeParse(coercePoDates(req.body));
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const values = flattenPoBody(parsed.data);
  const [updated] = await db
    .update(proceduralOrdersTable)
    .set(values)
    .where(
      and(
        eq(proceduralOrdersTable.id, params.data.poId),
        eq(proceduralOrdersTable.caseId, params.data.caseId)
      )
    )
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Procedural order not found" });
    return;
  }
  res.json(updated);
});

router.delete("/cases/:caseId/procedural-orders/:poId", async (req, res): Promise<void> => {
  const params = DeleteProceduralOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(proceduralOrdersTable)
    .where(
      and(
        eq(proceduralOrdersTable.id, params.data.poId),
        eq(proceduralOrdersTable.caseId, params.data.caseId)
      )
    )
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Procedural order not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/cases/:caseId/procedural-orders/:poId/apply-to-deadlines", async (req, res): Promise<void> => {
  const params = ApplyPoToDeadlinesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // Find the PO so we know its number
  const [po] = await db
    .select()
    .from(proceduralOrdersTable)
    .where(
      and(
        eq(proceduralOrdersTable.id, params.data.poId),
        eq(proceduralOrdersTable.caseId, params.data.caseId)
      )
    );
  if (!po) {
    res.status(404).json({ error: "Procedural order not found" });
    return;
  }

  const parsed = ApplyPoToDeadlinesBody.safeParse(coerceApplyBody(req.body));
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updatedDeadlines = [];
  for (const update of parsed.data.updates) {
    const newDueDate = update.newDueDate instanceof Date
      ? update.newDueDate.toISOString().split("T")[0]
      : update.newDueDate;

    // Fetch current deadline to preserve originalDueDate
    const [current] = await db
      .select()
      .from(deadlinesTable)
      .where(
        and(
          eq(deadlinesTable.id, update.deadlineId),
          eq(deadlinesTable.caseId, params.data.caseId)
        )
      );
    if (!current) continue;

    const originalDueDate = current.originalDueDate ?? current.dueDate;

    const [updated] = await db
      .update(deadlinesTable)
      .set({
        dueDate: newDueDate,
        originalDueDate,
        status: "Extended",
        extensionOrderRef: po.poNumber,
      })
      .where(
        and(
          eq(deadlinesTable.id, update.deadlineId),
          eq(deadlinesTable.caseId, params.data.caseId)
        )
      )
      .returning();
    if (updated) updatedDeadlines.push(updated);
  }

  res.json(updatedDeadlines);
});

export default router;
