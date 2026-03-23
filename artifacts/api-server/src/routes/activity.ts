import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import {
  db,
  deadlinesTable,
  exhibitsTable,
  proceduralOrdersTable,
  timeEntriesTable,
  disbursementsTable,
  hearingsTable,
} from "@workspace/db";

const router = Router();

router.get("/cases/:caseId/activity", async (req, res) => {
  const caseId = Number(req.params.caseId);
  if (!caseId) return res.status(400).json({ error: "Invalid caseId" });

  const [deadlines, exhibits, orders, timeEntries, disbursements, hearings] = await Promise.all([
    db.select({ label: deadlinesTable.description, createdAt: deadlinesTable.createdAt })
      .from(deadlinesTable).where(eq(deadlinesTable.caseId, caseId))
      .orderBy(desc(deadlinesTable.createdAt)).limit(10),
    db.select({ label: exhibitsTable.description, createdAt: exhibitsTable.createdAt, extra: exhibitsTable.exhibitNumber })
      .from(exhibitsTable).where(eq(exhibitsTable.caseId, caseId))
      .orderBy(desc(exhibitsTable.createdAt)).limit(10),
    db.select({ label: proceduralOrdersTable.summary, createdAt: proceduralOrdersTable.createdAt })
      .from(proceduralOrdersTable).where(eq(proceduralOrdersTable.caseId, caseId))
      .orderBy(desc(proceduralOrdersTable.createdAt)).limit(10),
    db.select({ label: timeEntriesTable.description, createdAt: timeEntriesTable.createdAt, extra: timeEntriesTable.memberName })
      .from(timeEntriesTable).where(eq(timeEntriesTable.caseId, caseId))
      .orderBy(desc(timeEntriesTable.createdAt)).limit(10),
    db.select({ label: disbursementsTable.description, createdAt: disbursementsTable.createdAt, extra: disbursementsTable.category })
      .from(disbursementsTable).where(eq(disbursementsTable.caseId, caseId))
      .orderBy(desc(disbursementsTable.createdAt)).limit(10),
    db.select({ label: hearingsTable.hearingType, createdAt: hearingsTable.createdAt })
      .from(hearingsTable).where(eq(hearingsTable.caseId, caseId))
      .orderBy(desc(hearingsTable.createdAt)).limit(10),
  ]);

  const feed = [
    ...deadlines.map((r) => ({ type: "deadline", action: "Deadline added", detail: r.label, createdAt: r.createdAt.toISOString() })),
    ...exhibits.map((r) => ({ type: "exhibit", action: "Exhibit registered", detail: `${r.extra} — ${r.label}`, createdAt: r.createdAt.toISOString() })),
    ...orders.map((r) => ({ type: "po", action: "PO issued", detail: r.label, createdAt: r.createdAt.toISOString() })),
    ...timeEntries.map((r) => ({ type: "time", action: "Time logged", detail: `${r.extra}: ${r.label}`, createdAt: r.createdAt.toISOString() })),
    ...disbursements.map((r) => ({ type: "disbursement", action: "Disbursement logged", detail: `${r.extra} — ${r.label}`, createdAt: r.createdAt.toISOString() })),
    ...hearings.map((r) => ({ type: "hearing", action: "Hearing scheduled", detail: r.label, createdAt: r.createdAt.toISOString() })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  res.json(feed);
});

export default router;
