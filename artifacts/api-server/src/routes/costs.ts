import { Router } from "express";
import { eq, and } from "drizzle-orm";
import {
  db,
  rateCardTable,
  timeEntriesTable,
  disbursementsTable,
  costsSettingsTable,
} from "@workspace/db";
import {
  ListRateCardParams,
  AddRateCardMemberParams,
  AddRateCardMemberBody,
  UpdateRateCardMemberParams,
  UpdateRateCardMemberBody,
  DeleteRateCardMemberParams,
  ListTimeEntriesParams,
  AddTimeEntryParams,
  AddTimeEntryBody,
  UpdateTimeEntryParams,
  UpdateTimeEntryBody,
  DeleteTimeEntryParams,
  ListDisbursementsParams,
  AddDisbursementParams,
  AddDisbursementBody,
  UpdateDisbursementParams,
  UpdateDisbursementBody,
  DeleteDisbursementParams,
  GetCostsSettingsParams,
  UpsertCostsSettingsParams,
  UpsertCostsSettingsBody,
} from "@workspace/api-zod";

const router = Router();

/* ────────────────────────────────────── RATE CARD ── */

router.get("/cases/:caseId/rate-card", async (req, res) => {
  const parsed = ListRateCardParams.safeParse({ caseId: Number(req.params.caseId) });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const rows = await db
    .select()
    .from(rateCardTable)
    .where(eq(rateCardTable.caseId, parsed.data.caseId))
    .orderBy(rateCardTable.createdAt);
  res.json(rows);
});

router.post("/cases/:caseId/rate-card", async (req, res) => {
  const params = AddRateCardMemberParams.safeParse({ caseId: Number(req.params.caseId) });
  if (!params.success) return res.status(400).json({ error: params.error.message });
  const body = AddRateCardMemberBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.message });
  const [row] = await db
    .insert(rateCardTable)
    .values({ ...body.data, caseId: params.data.caseId })
    .returning();
  res.status(201).json(row);
});

router.put("/cases/:caseId/rate-card/:memberId", async (req, res) => {
  const params = UpdateRateCardMemberParams.safeParse({
    caseId: Number(req.params.caseId),
    memberId: Number(req.params.memberId),
  });
  if (!params.success) return res.status(400).json({ error: params.error.message });
  const body = UpdateRateCardMemberBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.message });
  const [updated] = await db
    .update(rateCardTable)
    .set({ ...body.data })
    .where(and(eq(rateCardTable.id, params.data.memberId), eq(rateCardTable.caseId, params.data.caseId)))
    .returning();
  if (!updated) return res.status(404).json({ error: "Member not found" });
  res.json(updated);
});

router.delete("/cases/:caseId/rate-card/:memberId", async (req, res) => {
  const params = DeleteRateCardMemberParams.safeParse({
    caseId: Number(req.params.caseId),
    memberId: Number(req.params.memberId),
  });
  if (!params.success) return res.status(400).json({ error: params.error.message });
  const [deleted] = await db
    .delete(rateCardTable)
    .where(and(eq(rateCardTable.id, params.data.memberId), eq(rateCardTable.caseId, params.data.caseId)))
    .returning();
  if (!deleted) return res.status(404).json({ error: "Member not found" });
  res.status(204).send();
});

/* ────────────────────────────────────── TIME ENTRIES ── */

router.get("/cases/:caseId/time-entries", async (req, res) => {
  const parsed = ListTimeEntriesParams.safeParse({ caseId: Number(req.params.caseId) });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const rows = await db
    .select()
    .from(timeEntriesTable)
    .where(eq(timeEntriesTable.caseId, parsed.data.caseId))
    .orderBy(timeEntriesTable.date, timeEntriesTable.createdAt);
  res.json(rows);
});

router.post("/cases/:caseId/time-entries", async (req, res) => {
  const params = AddTimeEntryParams.safeParse({ caseId: Number(req.params.caseId) });
  if (!params.success) return res.status(400).json({ error: params.error.message });
  const raw = { ...req.body };
  if (typeof raw.date === "string") raw.date = new Date(raw.date);
  const body = AddTimeEntryBody.safeParse(raw);
  if (!body.success) return res.status(400).json({ error: body.error.message });
  const flat = {
    ...body.data,
    date: body.data.date instanceof Date ? body.data.date.toISOString().split("T")[0] : body.data.date,
  };
  const [row] = await db.insert(timeEntriesTable).values({ ...flat, caseId: params.data.caseId }).returning();
  res.status(201).json(row);
});

router.put("/cases/:caseId/time-entries/:entryId", async (req, res) => {
  const params = UpdateTimeEntryParams.safeParse({
    caseId: Number(req.params.caseId),
    entryId: Number(req.params.entryId),
  });
  if (!params.success) return res.status(400).json({ error: params.error.message });
  const raw = { ...req.body };
  if (typeof raw.date === "string") raw.date = new Date(raw.date);
  const body = UpdateTimeEntryBody.safeParse(raw);
  if (!body.success) return res.status(400).json({ error: body.error.message });
  const flat = {
    ...body.data,
    date: body.data.date instanceof Date ? body.data.date.toISOString().split("T")[0] : body.data.date,
  };
  const [updated] = await db
    .update(timeEntriesTable)
    .set(flat)
    .where(and(eq(timeEntriesTable.id, params.data.entryId), eq(timeEntriesTable.caseId, params.data.caseId)))
    .returning();
  if (!updated) return res.status(404).json({ error: "Entry not found" });
  res.json(updated);
});

router.delete("/cases/:caseId/time-entries/:entryId", async (req, res) => {
  const params = DeleteTimeEntryParams.safeParse({
    caseId: Number(req.params.caseId),
    entryId: Number(req.params.entryId),
  });
  if (!params.success) return res.status(400).json({ error: params.error.message });
  const [deleted] = await db
    .delete(timeEntriesTable)
    .where(and(eq(timeEntriesTable.id, params.data.entryId), eq(timeEntriesTable.caseId, params.data.caseId)))
    .returning();
  if (!deleted) return res.status(404).json({ error: "Entry not found" });
  res.status(204).send();
});

/* ────────────────────────────────────── DISBURSEMENTS ── */

router.get("/cases/:caseId/disbursements", async (req, res) => {
  const parsed = ListDisbursementsParams.safeParse({ caseId: Number(req.params.caseId) });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const rows = await db
    .select()
    .from(disbursementsTable)
    .where(eq(disbursementsTable.caseId, parsed.data.caseId))
    .orderBy(disbursementsTable.date, disbursementsTable.createdAt);
  res.json(rows);
});

router.post("/cases/:caseId/disbursements", async (req, res) => {
  const params = AddDisbursementParams.safeParse({ caseId: Number(req.params.caseId) });
  if (!params.success) return res.status(400).json({ error: params.error.message });
  const raw = { ...req.body };
  if (typeof raw.date === "string") raw.date = new Date(raw.date);
  const body = AddDisbursementBody.safeParse(raw);
  if (!body.success) return res.status(400).json({ error: body.error.message });
  const flat = {
    ...body.data,
    date: body.data.date instanceof Date ? body.data.date.toISOString().split("T")[0] : body.data.date,
  };
  const [row] = await db.insert(disbursementsTable).values({ ...flat, caseId: params.data.caseId }).returning();
  res.status(201).json(row);
});

router.put("/cases/:caseId/disbursements/:disbId", async (req, res) => {
  const params = UpdateDisbursementParams.safeParse({
    caseId: Number(req.params.caseId),
    disbId: Number(req.params.disbId),
  });
  if (!params.success) return res.status(400).json({ error: params.error.message });
  const raw = { ...req.body };
  if (typeof raw.date === "string") raw.date = new Date(raw.date);
  const body = UpdateDisbursementBody.safeParse(raw);
  if (!body.success) return res.status(400).json({ error: body.error.message });
  const flat = {
    ...body.data,
    date: body.data.date instanceof Date ? body.data.date.toISOString().split("T")[0] : body.data.date,
  };
  const [updated] = await db
    .update(disbursementsTable)
    .set(flat)
    .where(and(eq(disbursementsTable.id, params.data.disbId), eq(disbursementsTable.caseId, params.data.caseId)))
    .returning();
  if (!updated) return res.status(404).json({ error: "Disbursement not found" });
  res.json(updated);
});

router.delete("/cases/:caseId/disbursements/:disbId", async (req, res) => {
  const params = DeleteDisbursementParams.safeParse({
    caseId: Number(req.params.caseId),
    disbId: Number(req.params.disbId),
  });
  if (!params.success) return res.status(400).json({ error: params.error.message });
  const [deleted] = await db
    .delete(disbursementsTable)
    .where(and(eq(disbursementsTable.id, params.data.disbId), eq(disbursementsTable.caseId, params.data.caseId)))
    .returning();
  if (!deleted) return res.status(404).json({ error: "Disbursement not found" });
  res.status(204).send();
});

/* ────────────────────────────────────── COSTS SETTINGS ── */

router.get("/cases/:caseId/costs-settings", async (req, res) => {
  const parsed = GetCostsSettingsParams.safeParse({ caseId: Number(req.params.caseId) });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [row] = await db
    .select()
    .from(costsSettingsTable)
    .where(eq(costsSettingsTable.caseId, parsed.data.caseId));
  if (!row) {
    return res.json({
      id: null,
      caseId: parsed.data.caseId,
      iccAdvanceAmount: null,
      iccCurrency: "USD",
      claimantPaid: "0",
      respondentPaid: "0",
      totalBudget: null,
      budgetCurrency: "USD",
      notes: null,
      updatedAt: new Date().toISOString(),
    });
  }
  res.json(row);
});

router.put("/cases/:caseId/costs-settings", async (req, res) => {
  const params = UpsertCostsSettingsParams.safeParse({ caseId: Number(req.params.caseId) });
  if (!params.success) return res.status(400).json({ error: params.error.message });
  const body = UpsertCostsSettingsBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.message });

  const existing = await db
    .select({ id: costsSettingsTable.id })
    .from(costsSettingsTable)
    .where(eq(costsSettingsTable.caseId, params.data.caseId));

  let row;
  if (existing.length > 0) {
    [row] = await db
      .update(costsSettingsTable)
      .set({ ...body.data })
      .where(eq(costsSettingsTable.caseId, params.data.caseId))
      .returning();
  } else {
    [row] = await db
      .insert(costsSettingsTable)
      .values({ ...body.data, caseId: params.data.caseId })
      .returning();
  }
  res.json(row);
});

export default router;
