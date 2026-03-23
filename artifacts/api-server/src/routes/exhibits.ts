import { Router } from "express";
import { eq, and, count } from "drizzle-orm";
import { db, exhibitsTable } from "@workspace/db";
import {
  ListExhibitsParams,
  AddExhibitParams,
  UpdateExhibitParams,
  DeleteExhibitParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/cases/:caseId/exhibits", async (req, res) => {
  const parsed = ListExhibitsParams.safeParse({ caseId: Number(req.params.caseId) });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const rows = await db
    .select()
    .from(exhibitsTable)
    .where(eq(exhibitsTable.caseId, parsed.data.caseId))
    .orderBy(exhibitsTable.exhibitNumber, exhibitsTable.createdAt);
  res.json(rows);
});

router.post("/cases/:caseId/exhibits", async (req, res) => {
  const params = AddExhibitParams.safeParse({ caseId: Number(req.params.caseId) });
  if (!params.success) return res.status(400).json({ error: params.error.message });

  const body = req.body ?? {};
  const party = body.party === "Respondent" ? "Respondent" : "Claimant";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const dateRaw = typeof body.date === "string" ? body.date : "";
  const status = ["Filed", "Pending", "Agreed", "Disputed"].includes(body.status) ? body.status : "Filed";
  const docRef = typeof body.docRef === "string" && body.docRef ? body.docRef : null;

  if (!description) return res.status(400).json({ error: "description is required" });
  if (!dateRaw) return res.status(400).json({ error: "date is required" });

  // Normalize date to YYYY-MM-DD string
  let date = dateRaw;
  if (date.includes("T")) date = date.split("T")[0];

  let exhibitNumber = typeof body.exhibitNumber === "string" && body.exhibitNumber.trim()
    ? body.exhibitNumber.trim()
    : null;

  if (!exhibitNumber) {
    const partyPrefix = party === "Claimant" ? "C" : "R";
    const [countRow] = await db
      .select({ cnt: count() })
      .from(exhibitsTable)
      .where(and(eq(exhibitsTable.caseId, params.data.caseId), eq(exhibitsTable.party, party)));
    const next = (Number(countRow?.cnt ?? 0) + 1).toString().padStart(3, "0");
    exhibitNumber = `${partyPrefix}-${next}`;
  }

  const [row] = await db.insert(exhibitsTable).values({
    caseId: params.data.caseId,
    exhibitNumber,
    party,
    description,
    date,
    docRef,
    status,
  }).returning();
  res.status(201).json(row);
});

router.put("/cases/:caseId/exhibits/:exhibitId", async (req, res) => {
  const params = UpdateExhibitParams.safeParse({
    caseId: Number(req.params.caseId),
    exhibitId: Number(req.params.exhibitId),
  });
  if (!params.success) return res.status(400).json({ error: params.error.message });

  const body = req.body ?? {};
  const updates: Record<string, any> = {};
  if (typeof body.exhibitNumber === "string" && body.exhibitNumber.trim()) updates.exhibitNumber = body.exhibitNumber.trim();
  if (body.party === "Claimant" || body.party === "Respondent") updates.party = body.party;
  if (typeof body.description === "string" && body.description.trim()) updates.description = body.description.trim();
  if (typeof body.status === "string" && ["Filed", "Pending", "Agreed", "Disputed"].includes(body.status)) updates.status = body.status;
  if (typeof body.docRef === "string") updates.docRef = body.docRef || null;
  if (typeof body.date === "string" && body.date) {
    updates.date = body.date.includes("T") ? body.date.split("T")[0] : body.date;
  }

  if (Object.keys(updates).length === 0) return res.status(400).json({ error: "No valid fields to update" });

  const [updated] = await db
    .update(exhibitsTable)
    .set(updates)
    .where(and(eq(exhibitsTable.id, params.data.exhibitId), eq(exhibitsTable.caseId, params.data.caseId)))
    .returning();
  if (!updated) return res.status(404).json({ error: "Exhibit not found" });
  res.json(updated);
});

router.delete("/cases/:caseId/exhibits/:exhibitId", async (req, res) => {
  const params = DeleteExhibitParams.safeParse({
    caseId: Number(req.params.caseId),
    exhibitId: Number(req.params.exhibitId),
  });
  if (!params.success) return res.status(400).json({ error: params.error.message });
  const [deleted] = await db
    .delete(exhibitsTable)
    .where(and(eq(exhibitsTable.id, params.data.exhibitId), eq(exhibitsTable.caseId, params.data.caseId)))
    .returning();
  if (!deleted) return res.status(404).json({ error: "Exhibit not found" });
  res.status(204).send();
});

export default router;
