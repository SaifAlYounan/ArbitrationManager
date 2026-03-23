import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, casePreferencesTable } from "@workspace/db";
const router = Router();

function parsePrefsBody(body: any): { reminderDays: number; emailNotifications: boolean; reminderEmail: string | null } | null {
  const days = Number(body?.reminderDays ?? 7);
  if (!Number.isInteger(days) || days < 1 || days > 90) return null;
  return {
    reminderDays: days,
    emailNotifications: Boolean(body?.emailNotifications ?? false),
    reminderEmail: typeof body?.reminderEmail === "string" && body.reminderEmail ? body.reminderEmail : null,
  };
}

router.get("/cases/:caseId/preferences", async (req, res) => {
  const caseId = Number(req.params.caseId);
  if (!caseId) return res.status(400).json({ error: "Invalid caseId" });
  const [row] = await db.select().from(casePreferencesTable).where(eq(casePreferencesTable.caseId, caseId));
  if (!row) {
    return res.json({ id: null, caseId, reminderDays: 7, emailNotifications: false, reminderEmail: null, updatedAt: new Date().toISOString() });
  }
  res.json(row);
});

router.put("/cases/:caseId/preferences", async (req, res) => {
  const caseId = Number(req.params.caseId);
  if (!caseId) return res.status(400).json({ error: "Invalid caseId" });
  const parsed = parsePrefsBody(req.body);
  if (!parsed) return res.status(400).json({ error: "Invalid preferences data" });

  const existing = await db.select({ id: casePreferencesTable.id }).from(casePreferencesTable).where(eq(casePreferencesTable.caseId, caseId));
  let row;
  if (existing.length > 0) {
    [row] = await db.update(casePreferencesTable).set(parsed).where(eq(casePreferencesTable.caseId, caseId)).returning();
  } else {
    [row] = await db.insert(casePreferencesTable).values({ ...parsed, caseId }).returning();
  }
  res.json(row);
});

export default router;
