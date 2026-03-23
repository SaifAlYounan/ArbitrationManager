import { Router } from "express";
import { eq, and, ilike, or } from "drizzle-orm";
import {
  db,
  deadlinesTable,
  exhibitsTable,
  proceduralOrdersTable,
  timeEntriesTable,
} from "@workspace/db";

const router = Router();

router.get("/cases/:caseId/search", async (req, res) => {
  const caseId = Number(req.params.caseId);
  const q = String(req.query.q ?? "").trim();
  if (!caseId) return res.status(400).json({ error: "Invalid caseId" });
  if (!q || q.length < 2) return res.json({ deadlines: [], exhibits: [], orders: [], timeEntries: [] });

  const pattern = `%${q}%`;

  const [deadlines, exhibits, orders, timeEntries] = await Promise.all([
    db.select({ id: deadlinesTable.id, description: deadlinesTable.description, dueDate: deadlinesTable.dueDate, responsible: deadlinesTable.responsibleParty })
      .from(deadlinesTable)
      .where(and(eq(deadlinesTable.caseId, caseId), ilike(deadlinesTable.description, pattern)))
      .limit(10),
    db.select({ id: exhibitsTable.id, exhibitNumber: exhibitsTable.exhibitNumber, description: exhibitsTable.description, party: exhibitsTable.party, status: exhibitsTable.status })
      .from(exhibitsTable)
      .where(and(eq(exhibitsTable.caseId, caseId), or(ilike(exhibitsTable.description, pattern), ilike(exhibitsTable.exhibitNumber, pattern))))
      .limit(10),
    db.select({ id: proceduralOrdersTable.id, summary: proceduralOrdersTable.summary, poNumber: proceduralOrdersTable.poNumber, isFinalized: proceduralOrdersTable.isFinalized })
      .from(proceduralOrdersTable)
      .where(and(eq(proceduralOrdersTable.caseId, caseId), ilike(proceduralOrdersTable.summary, pattern)))
      .limit(10),
    db.select({ id: timeEntriesTable.id, description: timeEntriesTable.description, memberName: timeEntriesTable.memberName, phase: timeEntriesTable.phase })
      .from(timeEntriesTable)
      .where(and(eq(timeEntriesTable.caseId, caseId), or(ilike(timeEntriesTable.description, pattern), ilike(timeEntriesTable.memberName, pattern))))
      .limit(10),
  ]);

  res.json({ deadlines, exhibits, orders, timeEntries });
});

export default router;
