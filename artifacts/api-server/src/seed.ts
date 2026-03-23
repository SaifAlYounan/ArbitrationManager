import { db } from "@workspace/db";
import {
  casesTable, tribunalMembersTable, representativesTable,
  deadlinesTable, proceduralOrdersTable, exhibitsTable,
  rateCardTable, timeEntriesTable, disbursementsTable,
} from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { logger } from "./lib/logger";

const DEMO_REFS = [
  "ICC/2025/ARB-4421",
  "ICC/2024/ARB-8871",
  "ICC/2023/ARB-2209",
];

export async function seedDemoCases() {
  try {
    // Check if demo cases already exist
    const existing = await db
      .select({ caseReference: casesTable.caseReference })
      .from(casesTable)
      .where(inArray(casesTable.caseReference, DEMO_REFS));

    const existingRefs = new Set(existing.map((r) => r.caseReference));
    const missing = DEMO_REFS.filter((r) => !existingRefs.has(r));

    if (missing.length === 0) {
      logger.info("Demo cases already present — skipping seed");
      return;
    }

    logger.info({ missing }, "Seeding demo cases");

    for (const ref of missing) {
      if (ref === "ICC/2025/ARB-4421") await seedCase1();
      if (ref === "ICC/2024/ARB-8871") await seedCase2();
      if (ref === "ICC/2023/ARB-2209") await seedCase3();
    }

    logger.info("Demo seed complete");
  } catch (err) {
    logger.error({ err }, "Demo seed failed (non-fatal)");
  }
}

/* ──────────────────────────────────────────────
   CASE 1 — Nexum Energy (early-stage)
────────────────────────────────────────────── */
async function seedCase1() {
  const [c] = await db.insert(casesTable).values({
    caseReference: "ICC/2025/ARB-4421",
    caseName: "Nexum Energy GmbH v. Republic of Latvinia",
    claimants: "Nexum Energy GmbH",
    respondents: "Republic of Latvinia",
    seatOfArbitration: "Geneva",
    languageOfArbitration: "English",
    applicableRules: "ICC 2021",
    dateOfRequest: "2024-11-01",
    currency: "USD",
    status: "Active",
  }).returning({ id: casesTable.id });

  const caseId = c.id;

  await db.insert(tribunalMembersTable).values([
    { caseId, name: "Prof. Anna Müller", role: "Sole Arbitrator", email: "a.muller@icc-tribunal.org", timeZone: "Europe/Zurich" },
  ]);

  await db.insert(deadlinesTable).values([
    { caseId, description: "Answer to Request for Arbitration", responsibleParty: "Respondent", dueDate: "2024-12-15", status: "Completed", notes: "Filed 12 Dec 2024" },
    { caseId, description: "Case Management Conference", responsibleParty: "All", dueDate: "2026-04-10", status: "Pending" },
    { caseId, description: "Signature of Terms of Reference", responsibleParty: "All", dueDate: "2026-04-25", status: "Pending" },
    { caseId, description: "Claimant Memorial (Statement of Claim)", responsibleParty: "Claimant", dueDate: "2026-07-15", status: "Pending" },
  ]);

  await db.insert(exhibitsTable).values([
    { caseId, exhibitNumber: "C-001", party: "Claimant", description: "Energy Supply and Investment Agreement dated 12 March 2021", date: "2024-11-15", status: "Filed" },
    { caseId, exhibitNumber: "C-002", party: "Claimant", description: "Notice of Dispute and Request for Arbitration dated 30 October 2024", date: "2024-11-01", status: "Filed" },
  ]);
}

/* ──────────────────────────────────────────────
   CASE 2 — Global Maritime (mid-stage)
────────────────────────────────────────────── */
async function seedCase2() {
  const [c] = await db.insert(casesTable).values({
    caseReference: "ICC/2024/ARB-8871",
    caseName: "Global Maritime Holdings Ltd v. Zenith Shipping SA",
    claimants: "Global Maritime Holdings Ltd",
    respondents: "Zenith Shipping SA",
    seatOfArbitration: "London",
    languageOfArbitration: "English",
    applicableRules: "ICC 2021",
    dateOfRequest: "2024-03-15",
    currency: "USD",
    status: "Active",
  }).returning({ id: casesTable.id });

  const caseId = c.id;

  await db.insert(tribunalMembersTable).values([
    { caseId, name: "Sir James Worthington QC", role: "President", email: "j.worthington@chambers-london.uk", timeZone: "Europe/London" },
    { caseId, name: "Prof. Claire Dubois", role: "Co-arbitrator", email: "c.dubois@icc-paris.fr", timeZone: "Europe/Paris" },
    { caseId, name: "Dr. Hans Berger", role: "Co-arbitrator", email: "h.berger@arb-institute.de", timeZone: "Europe/Berlin" },
  ]);

  await db.insert(representativesTable).values([
    { caseId, name: "Sarah Chen", firm: "Clyde & Partners LLP", role: "Lead Counsel", party: "Claimant", email: "s.chen@clydeandpartners.com", timeZone: "Europe/London" },
    { caseId, name: "Marco Pietri", firm: "Greenberg Traurig SCS", role: "Lead Counsel", party: "Respondent", email: "m.pietri@gtlaw.fr", timeZone: "Europe/Paris" },
  ]);

  await db.insert(deadlinesTable).values([
    { caseId, description: "Terms of Reference signed", responsibleParty: "All", dueDate: "2024-05-10", status: "Completed" },
    { caseId, description: "Claimant Memorial (Statement of Claim)", responsibleParty: "Claimant", dueDate: "2024-09-30", status: "Completed" },
    { caseId, description: "Respondent Counter-Memorial", responsibleParty: "Respondent", dueDate: "2026-04-15", status: "Pending" },
    { caseId, description: "Claimant Reply Memorial", responsibleParty: "Claimant", dueDate: "2026-07-10", status: "Pending" },
    { caseId, description: "Respondent Rejoinder", responsibleParty: "Respondent", dueDate: "2026-09-30", status: "Pending" },
  ]);

  await db.insert(proceduralOrdersTable).values([
    { caseId, poNumber: "PO1", dateIssued: "2024-05-10", summary: "Procedural Order No. 1 establishing the timetable for the exchange of pleadings and document production.", isFinalized: true },
  ]);

  await db.insert(exhibitsTable).values([
    { caseId, exhibitNumber: "C-001", party: "Claimant", description: "Charter Party Agreement dated 5 January 2023", date: "2024-04-10", status: "Filed" },
    { caseId, exhibitNumber: "C-002", party: "Claimant", description: "Vessel Inspection Report and Damage Assessment", date: "2024-04-10", status: "Filed" },
    { caseId, exhibitNumber: "C-003", party: "Claimant", description: "Correspondence re. Force Majeure Notice (March 2023)", date: "2024-04-15", status: "Agreed" },
    { caseId, exhibitNumber: "R-001", party: "Respondent", description: "Counter-Notice of Alleged Breach dated 28 March 2023", date: "2024-06-20", status: "Filed" },
    { caseId, exhibitNumber: "R-002", party: "Respondent", description: "Surveyor Expert Report on Vessel Condition", date: "2024-06-20", status: "Disputed" },
  ]);

  await db.insert(rateCardTable).values([
    { caseId, name: "Sarah Chen", role: "Partner", hourlyRate: "750.00", currency: "USD", party: "Claimant" },
  ]);

  await db.insert(timeEntriesTable).values([
    { caseId, memberName: "Sarah Chen", date: "2024-09-01", hours: "12.50", phase: "Written Submissions", description: "Drafting Statement of Claim" },
    { caseId, memberName: "Sarah Chen", date: "2024-09-10", hours: "8.00", phase: "Written Submissions", description: "Review and revising exhibits schedule" },
    { caseId, memberName: "Sarah Chen", date: "2024-09-20", hours: "6.00", phase: "General Case Management", description: "Pre-submission client calls and strategy" },
  ]);
}

/* ──────────────────────────────────────────────
   CASE 3 — Pacific Ventures (late-stage)
────────────────────────────────────────────── */
async function seedCase3() {
  const [c] = await db.insert(casesTable).values({
    caseReference: "ICC/2023/ARB-2209",
    caseName: "Pacific Ventures Corp v. SingCo International Pte Ltd",
    claimants: "Pacific Ventures Corp",
    respondents: "SingCo International Pte Ltd",
    seatOfArbitration: "Singapore",
    languageOfArbitration: "English",
    applicableRules: "ICC 2021",
    dateOfRequest: "2023-08-20",
    currency: "SGD",
    status: "Active",
  }).returning({ id: casesTable.id });

  const caseId = c.id;

  await db.insert(tribunalMembersTable).values([
    { caseId, name: "Dr. Josephine Tan SC", role: "President", email: "j.tan@maxwell-chambers.sg", timeZone: "Asia/Singapore" },
    { caseId, name: "Mr. William Park", role: "Co-arbitrator", email: "w.park@klgates.com", timeZone: "Asia/Seoul" },
    { caseId, name: "Prof. Lucia Ferraro", role: "Co-arbitrator", email: "l.ferraro@unige.it", timeZone: "Europe/Rome" },
  ]);

  await db.insert(representativesTable).values([
    { caseId, name: "David Lim", firm: "Rajah & Tann Singapore LLP", role: "Lead Counsel", party: "Claimant", email: "d.lim@rajahtann.com", timeZone: "Asia/Singapore" },
    { caseId, name: "Priya Sharma", firm: "WongPartnership LLP", role: "Lead Counsel", party: "Respondent", email: "p.sharma@wongpartnership.com", timeZone: "Asia/Singapore" },
  ]);

  await db.insert(deadlinesTable).values([
    { caseId, description: "Terms of Reference signed", responsibleParty: "All", dueDate: "2023-10-20", status: "Completed" },
    { caseId, description: "Document Production Round 1", responsibleParty: "All", dueDate: "2023-12-15", status: "Completed" },
    { caseId, description: "Claimant Memorial (Statement of Claim)", responsibleParty: "Claimant", dueDate: "2024-01-31", status: "Completed" },
    { caseId, description: "Respondent Counter-Memorial", responsibleParty: "Respondent", dueDate: "2024-03-31", status: "Completed" },
    { caseId, description: "Claimant Reply", responsibleParty: "Claimant", dueDate: "2024-05-31", status: "Completed" },
    { caseId, description: "Respondent Rejoinder", responsibleParty: "Respondent", dueDate: "2024-07-15", status: "Completed" },
    { caseId, description: "Pre-Hearing Submissions", responsibleParty: "All", dueDate: "2024-09-01", status: "Completed" },
    { caseId, description: "Merits Hearing (Singapore, 4 days)", responsibleParty: "All", dueDate: "2024-10-14", status: "Completed" },
    { caseId, description: "Post-Hearing Briefs", responsibleParty: "All", dueDate: "2024-12-02", status: "Completed" },
    { caseId, description: "Costs Submissions — Claimant", responsibleParty: "Claimant", dueDate: "2026-04-08", status: "Pending" },
    { caseId, description: "Costs Submissions — Respondent", responsibleParty: "Respondent", dueDate: "2026-04-30", status: "Pending" },
  ]);

  await db.insert(proceduralOrdersTable).values([
    { caseId, poNumber: "PO1", dateIssued: "2023-10-20", summary: "Procedural timetable, document production protocol, and e-filing procedures.", isFinalized: true },
    { caseId, poNumber: "PO2", dateIssued: "2024-08-01", summary: "Pre-hearing directions: witness schedule, time allocation, and agreed hearing bundle index.", isFinalized: true },
    { caseId, poNumber: "PO3", dateIssued: "2024-11-15", summary: "Directions for post-hearing briefs, costs submissions, and outstanding procedural matters.", isFinalized: true },
  ]);

  await db.insert(exhibitsTable).values([
    { caseId, exhibitNumber: "C-001", party: "Claimant", description: "Joint Venture Agreement dated 14 February 2020", date: "2023-10-05", status: "Agreed" },
    { caseId, exhibitNumber: "C-002", party: "Claimant", description: "Shareholders Agreement and Amendments (2020–2022)", date: "2023-10-05", status: "Agreed" },
    { caseId, exhibitNumber: "C-003", party: "Claimant", description: "Board Minutes — February 2022 Extraordinary General Meeting", date: "2023-10-05", status: "Disputed" },
    { caseId, exhibitNumber: "C-004", party: "Claimant", description: "Claimant Expert Report on Loss of Profits (Prof. Reyes, CPA)", date: "2024-01-15", status: "Filed" },
    { caseId, exhibitNumber: "C-005", party: "Claimant", description: "Correspondence between parties regarding buyout offer (Jan–Apr 2023)", date: "2024-01-20", status: "Filed" },
    { caseId, exhibitNumber: "R-001", party: "Respondent", description: "Counter Board Minutes — February 2022 EGM (annotated)", date: "2024-03-10", status: "Disputed" },
    { caseId, exhibitNumber: "R-002", party: "Respondent", description: "Respondent Expert Report on Valuation (Dr. Kwon, CFA)", date: "2024-03-10", status: "Filed" },
    { caseId, exhibitNumber: "R-003", party: "Respondent", description: "Audited Financial Statements of the JV Company 2019–2022", date: "2024-03-10", status: "Agreed" },
    { caseId, exhibitNumber: "R-004", party: "Respondent", description: "Independent Business Valuation Report (Big Four Accounting)", date: "2024-03-15", status: "Filed" },
  ]);

  const [rc1] = await db.insert(rateCardTable).values(
    { caseId, name: "David Lim", role: "Partner", hourlyRate: "850.00", currency: "SGD", party: "Claimant" }
  ).returning({ id: rateCardTable.id });

  const [rc2] = await db.insert(rateCardTable).values(
    { caseId, name: "Michelle Tan", role: "Senior Associate", hourlyRate: "450.00", currency: "SGD", party: "Claimant" }
  ).returning({ id: rateCardTable.id });

  await db.insert(timeEntriesTable).values([
    { caseId, rateCardId: rc1.id, memberName: "David Lim", date: "2024-01-15", hours: "45.50", phase: "Written Submissions", description: "Drafting and revising Statement of Claim" },
    { caseId, rateCardId: rc2.id, memberName: "Michelle Tan", date: "2024-01-20", hours: "62.00", phase: "Written Submissions", description: "Research, exhibits bundle, and document production" },
    { caseId, rateCardId: rc1.id, memberName: "David Lim", date: "2024-05-20", hours: "28.00", phase: "Written Submissions", description: "Drafting Reply Memorial" },
    { caseId, rateCardId: rc1.id, memberName: "David Lim", date: "2024-10-10", hours: "38.50", phase: "Hearing Preparation", description: "Hearing preparation — cross-examination outlines" },
    { caseId, rateCardId: rc2.id, memberName: "Michelle Tan", date: "2024-10-14", hours: "32.00", phase: "Hearing", description: "Hearing attendance and notes (4 days)" },
  ]);

  await db.insert(disbursementsTable).values([
    { caseId, category: "Translation", amount: "4200.00", currency: "SGD", date: "2024-01-25", description: "Translation of JV documentation from Mandarin", party: "Claimant" },
    { caseId, category: "Expert Fees", amount: "52000.00", currency: "SGD", date: "2024-02-01", description: "Prof. Reyes — expert report on loss of profits", party: "Claimant" },
    { caseId, category: "Travel", amount: "3840.00", currency: "SGD", date: "2024-10-12", description: "Economy flights and accommodation — Singapore hearing", party: "Claimant" },
  ]);
}
