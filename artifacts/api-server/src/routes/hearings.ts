import { Router } from "express";
import { eq, and } from "drizzle-orm";
import {
  db,
  hearingsTable,
  hearingParticipantsTable,
  witnessScheduleTable,
  hearingChecklistTable,
} from "@workspace/db";
import {
  ListHearingsParams,
  AddHearingParams,
  AddHearingBody,
  UpdateHearingParams,
  UpdateHearingBody,
  DeleteHearingParams,
  ListParticipantsParams,
  AddParticipantParams,
  AddParticipantBody,
  UpdateParticipantParams,
  UpdateParticipantBody,
  DeleteParticipantParams,
  ListWitnessScheduleParams,
  AddWitnessScheduleEntryParams,
  AddWitnessScheduleEntryBody,
  UpdateWitnessScheduleEntryParams,
  UpdateWitnessScheduleEntryBody,
  DeleteWitnessScheduleEntryParams,
  ListChecklistItemsParams,
  AddChecklistItemParams,
  AddChecklistItemBody,
  UpdateChecklistItemParams,
  UpdateChecklistItemBody,
  DeleteChecklistItemParams,
} from "@workspace/api-zod";

function coerceHearingDates(body: any) {
  const result = { ...body };
  if (typeof result.startDate === "string") result.startDate = new Date(result.startDate);
  if (typeof result.endDate === "string") result.endDate = new Date(result.endDate);
  return result;
}

function flattenHearingBody(parsed: any): any {
  return {
    ...parsed,
    startDate: parsed.startDate instanceof Date
      ? parsed.startDate.toISOString().split("T")[0]
      : parsed.startDate,
    endDate: parsed.endDate instanceof Date
      ? parsed.endDate.toISOString().split("T")[0]
      : parsed.endDate,
  };
}

function coerceWitnessDates(body: any) {
  const result = { ...body };
  if (typeof result.hearingDay === "string" && result.hearingDay) result.hearingDay = new Date(result.hearingDay);
  return result;
}

function flattenWitnessBody(parsed: any): any {
  return {
    ...parsed,
    hearingDay: parsed.hearingDay instanceof Date
      ? parsed.hearingDay.toISOString().split("T")[0]
      : parsed.hearingDay,
  };
}

const DEFAULT_CHECKLIST_ITEMS = [
  "Hearing room / virtual platform booked and confirmed",
  "Access / dial-in details circulated to all parties",
  "Technology test scheduled and completed",
  "Hearing bundle compiled and distributed",
  "Bundle receipt confirmed by all parties",
  "Interpreter confirmed and briefed",
  "Court reporter / transcription service confirmed",
  "Opening statement time allocated — Claimant",
  "Opening statement time allocated — Respondent",
  "Witness schedule circulated to parties",
  "Expert schedule circulated to parties",
  "Pre-hearing brief submitted — Claimant",
  "Pre-hearing brief submitted — Respondent",
  "Outstanding document production resolved",
  "Agreed list of issues finalised",
];

const router = Router();

router.get("/cases/:caseId/hearings", async (req, res) => {
  const parsed = ListHearingsParams.safeParse({ caseId: Number(req.params.caseId) });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const rows = await db
    .select()
    .from(hearingsTable)
    .where(eq(hearingsTable.caseId, parsed.data.caseId))
    .orderBy(hearingsTable.startDate);

  res.json(rows);
});

router.post("/cases/:caseId/hearings", async (req, res) => {
  const params = AddHearingParams.safeParse({ caseId: Number(req.params.caseId) });
  if (!params.success) return res.status(400).json({ error: params.error.message });

  const body = AddHearingBody.safeParse(coerceHearingDates(req.body));
  if (!body.success) return res.status(400).json({ error: body.error.message });

  const flat = flattenHearingBody(body.data);
  const [hearing] = await db
    .insert(hearingsTable)
    .values({ ...flat, caseId: params.data.caseId })
    .returning();

  await db.insert(hearingChecklistTable).values(
    DEFAULT_CHECKLIST_ITEMS.map((label, i) => ({
      hearingId: hearing.id,
      label,
      isDone: false,
      sortOrder: i,
      isCustom: false,
    }))
  );

  res.status(201).json(hearing);
});

router.put("/cases/:caseId/hearings/:hearingId", async (req, res) => {
  const params = UpdateHearingParams.safeParse({
    caseId: Number(req.params.caseId),
    hearingId: Number(req.params.hearingId),
  });
  if (!params.success) return res.status(400).json({ error: params.error.message });

  const body = UpdateHearingBody.safeParse(coerceHearingDates(req.body));
  if (!body.success) return res.status(400).json({ error: body.error.message });

  const flat = flattenHearingBody(body.data);
  const [updated] = await db
    .update(hearingsTable)
    .set({ ...flat })
    .where(
      and(
        eq(hearingsTable.id, params.data.hearingId),
        eq(hearingsTable.caseId, params.data.caseId)
      )
    )
    .returning();

  if (!updated) return res.status(404).json({ error: "Hearing not found" });
  res.json(updated);
});

router.delete("/cases/:caseId/hearings/:hearingId", async (req, res) => {
  const params = DeleteHearingParams.safeParse({
    caseId: Number(req.params.caseId),
    hearingId: Number(req.params.hearingId),
  });
  if (!params.success) return res.status(400).json({ error: params.error.message });

  const [deleted] = await db
    .delete(hearingsTable)
    .where(
      and(
        eq(hearingsTable.id, params.data.hearingId),
        eq(hearingsTable.caseId, params.data.caseId)
      )
    )
    .returning();

  if (!deleted) return res.status(404).json({ error: "Hearing not found" });
  res.status(204).send();
});

router.get("/hearings/:hearingId/participants", async (req, res) => {
  const parsed = ListParticipantsParams.safeParse({ hearingId: Number(req.params.hearingId) });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const rows = await db
    .select()
    .from(hearingParticipantsTable)
    .where(eq(hearingParticipantsTable.hearingId, parsed.data.hearingId))
    .orderBy(hearingParticipantsTable.createdAt);

  res.json(rows);
});

router.post("/hearings/:hearingId/participants", async (req, res) => {
  const params = AddParticipantParams.safeParse({ hearingId: Number(req.params.hearingId) });
  if (!params.success) return res.status(400).json({ error: params.error.message });

  const body = AddParticipantBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.message });

  const [row] = await db
    .insert(hearingParticipantsTable)
    .values({ ...body.data, hearingId: params.data.hearingId })
    .returning();

  res.status(201).json(row);
});

router.put("/hearings/:hearingId/participants/:participantId", async (req, res) => {
  const params = UpdateParticipantParams.safeParse({
    hearingId: Number(req.params.hearingId),
    participantId: Number(req.params.participantId),
  });
  if (!params.success) return res.status(400).json({ error: params.error.message });

  const body = UpdateParticipantBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.message });

  const [updated] = await db
    .update(hearingParticipantsTable)
    .set({ ...body.data })
    .where(
      and(
        eq(hearingParticipantsTable.id, params.data.participantId),
        eq(hearingParticipantsTable.hearingId, params.data.hearingId)
      )
    )
    .returning();

  if (!updated) return res.status(404).json({ error: "Participant not found" });
  res.json(updated);
});

router.delete("/hearings/:hearingId/participants/:participantId", async (req, res) => {
  const params = DeleteParticipantParams.safeParse({
    hearingId: Number(req.params.hearingId),
    participantId: Number(req.params.participantId),
  });
  if (!params.success) return res.status(400).json({ error: params.error.message });

  const [deleted] = await db
    .delete(hearingParticipantsTable)
    .where(
      and(
        eq(hearingParticipantsTable.id, params.data.participantId),
        eq(hearingParticipantsTable.hearingId, params.data.hearingId)
      )
    )
    .returning();

  if (!deleted) return res.status(404).json({ error: "Participant not found" });
  res.status(204).send();
});

router.get("/hearings/:hearingId/witness-schedule", async (req, res) => {
  const parsed = ListWitnessScheduleParams.safeParse({ hearingId: Number(req.params.hearingId) });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const rows = await db
    .select()
    .from(witnessScheduleTable)
    .where(eq(witnessScheduleTable.hearingId, parsed.data.hearingId))
    .orderBy(witnessScheduleTable.hearingDay, witnessScheduleTable.createdAt);

  res.json(rows);
});

router.post("/hearings/:hearingId/witness-schedule", async (req, res) => {
  const params = AddWitnessScheduleEntryParams.safeParse({ hearingId: Number(req.params.hearingId) });
  if (!params.success) return res.status(400).json({ error: params.error.message });

  const body = AddWitnessScheduleEntryBody.safeParse(coerceWitnessDates(req.body));
  if (!body.success) return res.status(400).json({ error: body.error.message });

  const flat = flattenWitnessBody(body.data);
  const [row] = await db
    .insert(witnessScheduleTable)
    .values({ ...flat, hearingId: params.data.hearingId })
    .returning();

  res.status(201).json(row);
});

router.put("/hearings/:hearingId/witness-schedule/:entryId", async (req, res) => {
  const params = UpdateWitnessScheduleEntryParams.safeParse({
    hearingId: Number(req.params.hearingId),
    entryId: Number(req.params.entryId),
  });
  if (!params.success) return res.status(400).json({ error: params.error.message });

  const body = UpdateWitnessScheduleEntryBody.safeParse(coerceWitnessDates(req.body));
  if (!body.success) return res.status(400).json({ error: body.error.message });

  const flat = flattenWitnessBody(body.data);
  const [updated] = await db
    .update(witnessScheduleTable)
    .set({ ...flat })
    .where(
      and(
        eq(witnessScheduleTable.id, params.data.entryId),
        eq(witnessScheduleTable.hearingId, params.data.hearingId)
      )
    )
    .returning();

  if (!updated) return res.status(404).json({ error: "Entry not found" });
  res.json(updated);
});

router.delete("/hearings/:hearingId/witness-schedule/:entryId", async (req, res) => {
  const params = DeleteWitnessScheduleEntryParams.safeParse({
    hearingId: Number(req.params.hearingId),
    entryId: Number(req.params.entryId),
  });
  if (!params.success) return res.status(400).json({ error: params.error.message });

  const [deleted] = await db
    .delete(witnessScheduleTable)
    .where(
      and(
        eq(witnessScheduleTable.id, params.data.entryId),
        eq(witnessScheduleTable.hearingId, params.data.hearingId)
      )
    )
    .returning();

  if (!deleted) return res.status(404).json({ error: "Entry not found" });
  res.status(204).send();
});

router.get("/hearings/:hearingId/checklist", async (req, res) => {
  const parsed = ListChecklistItemsParams.safeParse({ hearingId: Number(req.params.hearingId) });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const rows = await db
    .select()
    .from(hearingChecklistTable)
    .where(eq(hearingChecklistTable.hearingId, parsed.data.hearingId))
    .orderBy(hearingChecklistTable.sortOrder, hearingChecklistTable.createdAt);

  res.json(rows);
});

router.post("/hearings/:hearingId/checklist", async (req, res) => {
  const params = AddChecklistItemParams.safeParse({ hearingId: Number(req.params.hearingId) });
  if (!params.success) return res.status(400).json({ error: params.error.message });

  const body = AddChecklistItemBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.message });

  const existing = await db
    .select({ id: hearingChecklistTable.id })
    .from(hearingChecklistTable)
    .where(eq(hearingChecklistTable.hearingId, params.data.hearingId));

  const [row] = await db
    .insert(hearingChecklistTable)
    .values({
      hearingId: params.data.hearingId,
      label: body.data.label,
      isDone: false,
      isCustom: true,
      sortOrder: existing.length + DEFAULT_CHECKLIST_ITEMS.length,
    })
    .returning();

  res.status(201).json(row);
});

router.put("/hearings/:hearingId/checklist/:itemId", async (req, res) => {
  const params = UpdateChecklistItemParams.safeParse({
    hearingId: Number(req.params.hearingId),
    itemId: Number(req.params.itemId),
  });
  if (!params.success) return res.status(400).json({ error: params.error.message });

  const body = UpdateChecklistItemBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.message });

  const updateData: Record<string, unknown> = { isDone: body.data.isDone };
  if (body.data.doneDate !== undefined) updateData.doneDate = body.data.doneDate;
  if (body.data.notes !== undefined) updateData.notes = body.data.notes;
  if (body.data.label !== undefined) updateData.label = body.data.label;

  const [updated] = await db
    .update(hearingChecklistTable)
    .set(updateData)
    .where(
      and(
        eq(hearingChecklistTable.id, params.data.itemId),
        eq(hearingChecklistTable.hearingId, params.data.hearingId)
      )
    )
    .returning();

  if (!updated) return res.status(404).json({ error: "Checklist item not found" });
  res.json(updated);
});

router.delete("/hearings/:hearingId/checklist/:itemId", async (req, res) => {
  const params = DeleteChecklistItemParams.safeParse({
    hearingId: Number(req.params.hearingId),
    itemId: Number(req.params.itemId),
  });
  if (!params.success) return res.status(400).json({ error: params.error.message });

  const [deleted] = await db
    .delete(hearingChecklistTable)
    .where(
      and(
        eq(hearingChecklistTable.id, params.data.itemId),
        eq(hearingChecklistTable.hearingId, params.data.hearingId)
      )
    )
    .returning();

  if (!deleted) return res.status(404).json({ error: "Checklist item not found" });
  res.status(204).send();
});

export default router;
