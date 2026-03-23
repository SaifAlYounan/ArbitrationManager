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
    const existing = await db
      .select({ id: casesTable.id, caseReference: casesTable.caseReference })
      .from(casesTable)
      .where(inArray(casesTable.caseReference, DEMO_REFS));

    const existingMap = new Map(existing.map((r) => [r.caseReference, r.id]));
    const missing = DEMO_REFS.filter((r) => !existingMap.has(r));

    // Create case structure for any missing cases
    if (missing.length > 0) {
      logger.info({ missing }, "Seeding missing demo cases");
      for (const ref of missing) {
        if (ref === "ICC/2025/ARB-4421") await seedCase1Structure();
        if (ref === "ICC/2024/ARB-8871") await seedCase2Structure();
        if (ref === "ICC/2023/ARB-2209") await seedCase3Structure();
      }
    }

    // Re-fetch all three IDs (including newly created ones)
    const all = await db
      .select({ id: casesTable.id, caseReference: casesTable.caseReference })
      .from(casesTable)
      .where(inArray(casesTable.caseReference, DEMO_REFS));

    const allMap = new Map(all.map((r) => [r.caseReference, r.id]));

    // Always refresh costs data so every deploy stays consistent
    logger.info("Refreshing demo costs data");
    const id1 = allMap.get("ICC/2025/ARB-4421")!;
    const id2 = allMap.get("ICC/2024/ARB-8871")!;
    const id3 = allMap.get("ICC/2023/ARB-2209")!;

    await seedCosts1(id1);
    await seedCosts2(id2);
    await seedCosts3(id3);

    logger.info("Demo seed complete");
  } catch (err) {
    logger.error({ err }, "Demo seed failed (non-fatal)");
  }
}

/* ──────────────────────────────────────────────────────────────
   Helpers: clear and re-seed costs for a case
────────────────────────────────────────────────────────────── */
async function clearCosts(caseId: number) {
  await db.delete(timeEntriesTable).where(eq(timeEntriesTable.caseId, caseId));
  await db.delete(disbursementsTable).where(eq(disbursementsTable.caseId, caseId));
  await db.delete(rateCardTable).where(eq(rateCardTable.caseId, caseId));
}

/* ──────────────────────────────────────────────────────────────
   CASE 1 — Nexum Energy (early-stage, Geneva, USD)
   Filed Nov 2024. Pre-ToR. CMC upcoming Apr 2026.
────────────────────────────────────────────────────────────── */
async function seedCase1Structure() {
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

async function seedCosts1(caseId: number) {
  await clearCosts(caseId);

  const [rcF] = await db.insert(rateCardTable).values(
    { caseId, name: "Alexandra Fischer", role: "Partner", hourlyRate: "820.00", currency: "USD", party: "Claimant" }
  ).returning({ id: rateCardTable.id });
  const [rcB] = await db.insert(rateCardTable).values(
    { caseId, name: "Thomas Braun", role: "Senior Associate", hourlyRate: "420.00", currency: "USD", party: "Claimant" }
  ).returning({ id: rateCardTable.id });

  await db.insert(timeEntriesTable).values([
    { caseId, rateCardId: rcF.id, memberName: "Alexandra Fischer", date: "2024-11-12", hours: "8.00",  phase: "General Case Management", description: "Case intake, assessment of energy investment dispute and BIT analysis" },
    { caseId, rateCardId: rcF.id, memberName: "Alexandra Fischer", date: "2024-11-22", hours: "12.00", phase: "Written Submissions",     description: "Review and finalise Request for Arbitration and ICC Notice of Arbitration" },
    { caseId, rateCardId: rcF.id, memberName: "Alexandra Fischer", date: "2024-12-20", hours: "6.00",  phase: "General Case Management", description: "Analysis of Respondent's Answer to RfA and preliminary counter-strategy" },
    { caseId, rateCardId: rcF.id, memberName: "Alexandra Fischer", date: "2025-02-12", hours: "4.00",  phase: "General Case Management", description: "Expert engagement and preliminary quantum assessment meeting" },
    { caseId, rateCardId: rcF.id, memberName: "Alexandra Fischer", date: "2025-03-25", hours: "4.50",  phase: "General Case Management", description: "Client strategy session and preliminary case roadmap" },
    { caseId, rateCardId: rcF.id, memberName: "Alexandra Fischer", date: "2026-01-15", hours: "6.00",  phase: "General Case Management", description: "CMC preparation — draft procedural agenda and proposed timetable" },
    { caseId, rateCardId: rcF.id, memberName: "Alexandra Fischer", date: "2026-03-10", hours: "5.00",  phase: "General Case Management", description: "CMC attendance and post-conference Tribunal correspondence" },
    { caseId, rateCardId: rcB.id, memberName: "Thomas Braun",      date: "2024-11-18", hours: "14.00", phase: "General Case Management", description: "Document collection, exhibits schedule, initial investment treaty research" },
    { caseId, rateCardId: rcB.id, memberName: "Thomas Braun",      date: "2024-12-05", hours: "9.00",  phase: "General Case Management", description: "Research: Latvinian regulatory and energy sector legal framework" },
    { caseId, rateCardId: rcB.id, memberName: "Thomas Braun",      date: "2025-01-08", hours: "14.00", phase: "General Case Management", description: "BIT analysis — fair and equitable treatment and expropriation standards" },
    { caseId, rateCardId: rcB.id, memberName: "Thomas Braun",      date: "2025-02-20", hours: "10.00", phase: "General Case Management", description: "Jurisdictional objections and admissibility issues research" },
    { caseId, rateCardId: rcB.id, memberName: "Thomas Braun",      date: "2025-04-14", hours: "12.00", phase: "Written Submissions",     description: "Preliminary legal framework for Memorial — BIT liability analysis draft" },
    { caseId, rateCardId: rcB.id, memberName: "Thomas Braun",      date: "2026-02-10", hours: "8.00",  phase: "Written Submissions",     description: "Draft CMC submissions and proposed procedural timetable" },
    { caseId, rateCardId: rcB.id, memberName: "Thomas Braun",      date: "2026-03-05", hours: "4.50",  phase: "General Case Management", description: "Revising proposed timetable and Tribunal correspondence" },
  ]);

  await db.insert(disbursementsTable).values([
    { caseId, category: "Filing Fees",   amount: "5500.00", currency: "USD", date: "2024-11-05", description: "ICC Administrative Fees — Registration and advance on costs",       party: "Claimant" },
    { caseId, category: "Local Counsel", amount: "8200.00", currency: "USD", date: "2025-02-15", description: "Latvinian local counsel — initial engagement and regulatory advice", party: "Claimant" },
  ]);
}

/* ──────────────────────────────────────────────────────────────
   CASE 2 — Global Maritime (mid-stage, London, USD)
   Filed Mar 2024. SOC filed Sep 2024. Counter-Memorial pending.
────────────────────────────────────────────────────────────── */
async function seedCase2Structure() {
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
    { caseId, name: "Sir James Worthington QC", role: "President",      email: "j.worthington@chambers-london.uk", timeZone: "Europe/London" },
    { caseId, name: "Prof. Claire Dubois",       role: "Co-arbitrator", email: "c.dubois@icc-paris.fr",           timeZone: "Europe/Paris" },
    { caseId, name: "Dr. Hans Berger",           role: "Co-arbitrator", email: "h.berger@arb-institute.de",       timeZone: "Europe/Berlin" },
  ]);

  await db.insert(representativesTable).values([
    { caseId, name: "Sarah Chen",  firm: "Clyde & Partners LLP",    role: "Lead Counsel", party: "Claimant",   email: "s.chen@clydeandpartners.com", timeZone: "Europe/London" },
    { caseId, name: "Marco Pietri", firm: "Greenberg Traurig SCS", role: "Lead Counsel", party: "Respondent", email: "m.pietri@gtlaw.fr",            timeZone: "Europe/Paris" },
  ]);

  await db.insert(deadlinesTable).values([
    { caseId, description: "Terms of Reference signed",              responsibleParty: "All",       dueDate: "2024-05-10", status: "Completed" },
    { caseId, description: "Claimant Memorial (Statement of Claim)", responsibleParty: "Claimant",  dueDate: "2024-09-30", status: "Completed" },
    { caseId, description: "Respondent Counter-Memorial",            responsibleParty: "Respondent",dueDate: "2026-04-15", status: "Pending" },
    { caseId, description: "Claimant Reply Memorial",                responsibleParty: "Claimant",  dueDate: "2026-07-10", status: "Pending" },
    { caseId, description: "Respondent Rejoinder",                   responsibleParty: "Respondent",dueDate: "2026-09-30", status: "Pending" },
  ]);

  await db.insert(proceduralOrdersTable).values([
    { caseId, poNumber: "PO1", dateIssued: "2024-05-10", summary: "Procedural Order No. 1 establishing the timetable for the exchange of pleadings and document production.", isFinalized: true },
  ]);

  await db.insert(exhibitsTable).values([
    { caseId, exhibitNumber: "C-001", party: "Claimant",   description: "Charter Party Agreement dated 5 January 2023",                date: "2024-04-10", status: "Filed" },
    { caseId, exhibitNumber: "C-002", party: "Claimant",   description: "Vessel Inspection Report and Damage Assessment",              date: "2024-04-10", status: "Filed" },
    { caseId, exhibitNumber: "C-003", party: "Claimant",   description: "Correspondence re. Force Majeure Notice (March 2023)",        date: "2024-04-15", status: "Agreed" },
    { caseId, exhibitNumber: "R-001", party: "Respondent", description: "Counter-Notice of Alleged Breach dated 28 March 2023",        date: "2024-06-20", status: "Filed" },
    { caseId, exhibitNumber: "R-002", party: "Respondent", description: "Surveyor Expert Report on Vessel Condition",                   date: "2024-06-20", status: "Disputed" },
  ]);
}

async function seedCosts2(caseId: number) {
  await clearCosts(caseId);

  const [rcS] = await db.insert(rateCardTable).values(
    { caseId, name: "Sarah Chen",   role: "Partner",          hourlyRate: "750.00", currency: "USD", party: "Claimant" }
  ).returning({ id: rateCardTable.id });
  const [rcO] = await db.insert(rateCardTable).values(
    { caseId, name: "James Oliver", role: "Senior Associate", hourlyRate: "450.00", currency: "USD", party: "Claimant" }
  ).returning({ id: rateCardTable.id });
  const [rcW] = await db.insert(rateCardTable).values(
    { caseId, name: "Amy Walsh",    role: "Associate",        hourlyRate: "280.00", currency: "USD", party: "Claimant" }
  ).returning({ id: rateCardTable.id });

  await db.insert(timeEntriesTable).values([
    // Case inception & ToR (Mar-Apr 2024)
    { caseId, rateCardId: rcS.id, memberName: "Sarah Chen",   date: "2024-03-20", hours: "18.00", phase: "General Case Management", description: "Case intake, initial dispute assessment and Request for Arbitration preparation" },
    { caseId, rateCardId: rcO.id, memberName: "James Oliver", date: "2024-03-25", hours: "12.00", phase: "General Case Management", description: "Initial document collection and factual background research" },
    { caseId, rateCardId: rcS.id, memberName: "Sarah Chen",   date: "2024-04-18", hours: "8.00",  phase: "General Case Management", description: "Terms of Reference negotiation and case management conference attendance" },
    { caseId, rateCardId: rcO.id, memberName: "James Oliver", date: "2024-04-22", hours: "10.00", phase: "General Case Management", description: "CMC agenda preparation and procedural submissions" },
    { caseId, rateCardId: rcW.id, memberName: "Amy Walsh",    date: "2024-04-28", hours: "14.00", phase: "General Case Management", description: "Events chronology, initial exhibits schedule and document register" },
    // Document production (May-Jul 2024)
    { caseId, rateCardId: rcO.id, memberName: "James Oliver", date: "2024-05-15", hours: "22.00", phase: "Document Production",     description: "Document production requests — Redfern Schedule preparation and negotiation" },
    { caseId, rateCardId: rcW.id, memberName: "Amy Walsh",    date: "2024-05-22", hours: "40.00", phase: "Document Production",     description: "Document review and privilege assessment — first round production" },
    { caseId, rateCardId: rcO.id, memberName: "James Oliver", date: "2024-06-18", hours: "18.00", phase: "Document Production",     description: "Responding to Respondent's document requests and disclosure objections" },
    { caseId, rateCardId: rcW.id, memberName: "Amy Walsh",    date: "2024-06-25", hours: "35.00", phase: "Document Production",     description: "Document classification and agreed disclosure schedule preparation" },
    // Expert engagement (Jul 2024)
    { caseId, rateCardId: rcS.id, memberName: "Sarah Chen",   date: "2024-07-10", hours: "10.00", phase: "General Case Management", description: "Marine expert engagement — instruction of Capt. Hendricks and scope discussion" },
    { caseId, rateCardId: rcO.id, memberName: "James Oliver", date: "2024-07-22", hours: "16.00", phase: "General Case Management", description: "Expert instructions preparation and technical background note" },
    // Statement of Claim (Aug-Sep 2024)
    { caseId, rateCardId: rcS.id, memberName: "Sarah Chen",   date: "2024-08-05", hours: "28.00", phase: "Written Submissions",     description: "Drafting Statement of Claim — liability section and breach analysis" },
    { caseId, rateCardId: rcO.id, memberName: "James Oliver", date: "2024-08-12", hours: "42.00", phase: "Written Submissions",     description: "Research and drafting — causation, damage and quantum analysis" },
    { caseId, rateCardId: rcW.id, memberName: "Amy Walsh",    date: "2024-08-20", hours: "28.00", phase: "Written Submissions",     description: "Exhibits bundle preparation and factual narrative support" },
    { caseId, rateCardId: rcS.id, memberName: "Sarah Chen",   date: "2024-09-02", hours: "22.00", phase: "Written Submissions",     description: "Reviewing, revising and finalising Statement of Claim for filing" },
    { caseId, rateCardId: rcO.id, memberName: "James Oliver", date: "2024-09-08", hours: "32.00", phase: "Written Submissions",     description: "Expert report review and integration into Statement of Claim" },
    // Post-SOC (Oct-Dec 2024)
    { caseId, rateCardId: rcS.id, memberName: "Sarah Chen",   date: "2024-10-15", hours: "8.00",  phase: "General Case Management", description: "Post-filing client update and review of Respondent's procedural requests" },
    { caseId, rateCardId: rcO.id, memberName: "James Oliver", date: "2024-11-08", hours: "14.00", phase: "Document Production",     description: "Reviewing document production objections raised by Respondent" },
    // Counter-Memorial prep (Jan-Mar 2026)
    { caseId, rateCardId: rcS.id, memberName: "Sarah Chen",   date: "2026-02-05", hours: "10.00", phase: "Written Submissions",     description: "Strategy session for Counter-Memorial response — liability arguments" },
    { caseId, rateCardId: rcO.id, memberName: "James Oliver", date: "2026-02-18", hours: "14.00", phase: "Written Submissions",     description: "Preliminary research and outline for Reply Memorial" },
  ]);

  await db.insert(disbursementsTable).values([
    { caseId, category: "Expert Fees", amount: "38000.00", currency: "USD", date: "2024-07-15", description: "Capt. R. Hendricks — marine surveyor expert report on vessel condition and damage", party: "Claimant" },
    { caseId, category: "Technology",  amount: "4200.00",  currency: "USD", date: "2024-05-10", description: "E-disclosure platform fees — document review and production",                       party: "Claimant" },
    { caseId, category: "Court Fees",  amount: "1800.00",  currency: "USD", date: "2024-04-20", description: "Court reporting and transcription — Case Management Conference",                    party: "Claimant" },
  ]);
}

/* ──────────────────────────────────────────────────────────────
   CASE 3 — Pacific Ventures (late-stage, Singapore, SGD)
   Filed Aug 2023. Hearing Oct 2024. Now at costs submissions.
────────────────────────────────────────────────────────────── */
async function seedCase3Structure() {
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
    { caseId, name: "Dr. Josephine Tan SC", role: "President",      email: "j.tan@maxwell-chambers.sg", timeZone: "Asia/Singapore" },
    { caseId, name: "Mr. William Park",     role: "Co-arbitrator",  email: "w.park@klgates.com",        timeZone: "Asia/Seoul" },
    { caseId, name: "Prof. Lucia Ferraro",  role: "Co-arbitrator",  email: "l.ferraro@unige.it",        timeZone: "Europe/Rome" },
  ]);

  await db.insert(representativesTable).values([
    { caseId, name: "David Lim",    firm: "Rajah & Tann Singapore LLP", role: "Lead Counsel", party: "Claimant",   email: "d.lim@rajahtann.com",        timeZone: "Asia/Singapore" },
    { caseId, name: "Priya Sharma", firm: "WongPartnership LLP",        role: "Lead Counsel", party: "Respondent", email: "p.sharma@wongpartnership.com", timeZone: "Asia/Singapore" },
  ]);

  await db.insert(deadlinesTable).values([
    { caseId, description: "Terms of Reference signed",              responsibleParty: "All",       dueDate: "2023-10-20", status: "Completed" },
    { caseId, description: "Document Production Round 1",            responsibleParty: "All",       dueDate: "2023-12-15", status: "Completed" },
    { caseId, description: "Claimant Memorial (Statement of Claim)", responsibleParty: "Claimant",  dueDate: "2024-01-31", status: "Completed" },
    { caseId, description: "Respondent Counter-Memorial",            responsibleParty: "Respondent",dueDate: "2024-03-31", status: "Completed" },
    { caseId, description: "Claimant Reply",                         responsibleParty: "Claimant",  dueDate: "2024-05-31", status: "Completed" },
    { caseId, description: "Respondent Rejoinder",                   responsibleParty: "Respondent",dueDate: "2024-07-15", status: "Completed" },
    { caseId, description: "Pre-Hearing Submissions",                responsibleParty: "All",       dueDate: "2024-09-01", status: "Completed" },
    { caseId, description: "Merits Hearing (Singapore, 4 days)",     responsibleParty: "All",       dueDate: "2024-10-14", status: "Completed" },
    { caseId, description: "Post-Hearing Briefs",                    responsibleParty: "All",       dueDate: "2024-12-02", status: "Completed" },
    { caseId, description: "Costs Submissions — Claimant",           responsibleParty: "Claimant",  dueDate: "2026-04-08", status: "Pending" },
    { caseId, description: "Costs Submissions — Respondent",         responsibleParty: "Respondent",dueDate: "2026-04-30", status: "Pending" },
  ]);

  await db.insert(proceduralOrdersTable).values([
    { caseId, poNumber: "PO1", dateIssued: "2023-10-20", summary: "Procedural timetable, document production protocol, and e-filing procedures.", isFinalized: true },
    { caseId, poNumber: "PO2", dateIssued: "2024-08-01", summary: "Pre-hearing directions: witness schedule, time allocation, and agreed hearing bundle index.", isFinalized: true },
    { caseId, poNumber: "PO3", dateIssued: "2024-11-15", summary: "Directions for post-hearing briefs, costs submissions, and outstanding procedural matters.", isFinalized: true },
  ]);

  await db.insert(exhibitsTable).values([
    { caseId, exhibitNumber: "C-001", party: "Claimant",   description: "Joint Venture Agreement dated 14 February 2020",                    date: "2023-10-05", status: "Agreed" },
    { caseId, exhibitNumber: "C-002", party: "Claimant",   description: "Shareholders Agreement and Amendments (2020–2022)",                 date: "2023-10-05", status: "Agreed" },
    { caseId, exhibitNumber: "C-003", party: "Claimant",   description: "Board Minutes — February 2022 Extraordinary General Meeting",       date: "2023-10-05", status: "Disputed" },
    { caseId, exhibitNumber: "C-004", party: "Claimant",   description: "Claimant Expert Report on Loss of Profits (Prof. Reyes, CPA)",      date: "2024-01-15", status: "Filed" },
    { caseId, exhibitNumber: "C-005", party: "Claimant",   description: "Correspondence between parties regarding buyout offer (Jan–Apr 2023)", date: "2024-01-20", status: "Filed" },
    { caseId, exhibitNumber: "R-001", party: "Respondent", description: "Counter Board Minutes — February 2022 EGM (annotated)",             date: "2024-03-10", status: "Disputed" },
    { caseId, exhibitNumber: "R-002", party: "Respondent", description: "Respondent Expert Report on Valuation (Dr. Kwon, CFA)",             date: "2024-03-10", status: "Filed" },
    { caseId, exhibitNumber: "R-003", party: "Respondent", description: "Audited Financial Statements of the JV Company 2019–2022",          date: "2024-03-10", status: "Agreed" },
    { caseId, exhibitNumber: "R-004", party: "Respondent", description: "Independent Business Valuation Report (Big Four Accounting)",       date: "2024-03-15", status: "Filed" },
  ]);
}

async function seedCosts3(caseId: number) {
  await clearCosts(caseId);

  const [rcL] = await db.insert(rateCardTable).values(
    { caseId, name: "David Lim",    role: "Partner",          hourlyRate: "850.00", currency: "SGD", party: "Claimant" }
  ).returning({ id: rateCardTable.id });
  const [rcT] = await db.insert(rateCardTable).values(
    { caseId, name: "Michelle Tan", role: "Senior Associate", hourlyRate: "450.00", currency: "SGD", party: "Claimant" }
  ).returning({ id: rateCardTable.id });
  const [rcN] = await db.insert(rateCardTable).values(
    { caseId, name: "Rachel Ng",    role: "Associate",        hourlyRate: "280.00", currency: "SGD", party: "Claimant" }
  ).returning({ id: rateCardTable.id });

  await db.insert(timeEntriesTable).values([
    // Case inception (Aug-Oct 2023)
    { caseId, rateCardId: rcL.id, memberName: "David Lim",    date: "2023-08-25", hours: "12.00", phase: "General Case Management", description: "Case intake, preliminary assessment of JV dispute — breach and remedy analysis" },
    { caseId, rateCardId: rcL.id, memberName: "David Lim",    date: "2023-09-15", hours: "8.00",  phase: "General Case Management", description: "Initial client strategy sessions and Singaporean JV law engagement" },
    { caseId, rateCardId: rcT.id, memberName: "Michelle Tan", date: "2023-09-20", hours: "18.00", phase: "General Case Management", description: "Factual chronology, key documents review, initial exhibits schedule" },
    { caseId, rateCardId: rcL.id, memberName: "David Lim",    date: "2023-10-12", hours: "6.00",  phase: "General Case Management", description: "Terms of Reference negotiation and signing" },
    { caseId, rateCardId: rcT.id, memberName: "Michelle Tan", date: "2023-10-18", hours: "10.00", phase: "General Case Management", description: "ToR preparation and initial case management submissions" },
    // Document production (Nov-Dec 2023)
    { caseId, rateCardId: rcL.id, memberName: "David Lim",    date: "2023-11-08", hours: "10.00", phase: "Document Production",     description: "Document production requests — Redfern Schedule preparation" },
    { caseId, rateCardId: rcT.id, memberName: "Michelle Tan", date: "2023-11-15", hours: "30.00", phase: "Document Production",     description: "Document review, privilege log, first-round production schedule" },
    { caseId, rateCardId: rcN.id, memberName: "Rachel Ng",    date: "2023-11-20", hours: "38.00", phase: "Document Production",     description: "First-pass document review — JV records and board minutes 2020–2022" },
    { caseId, rateCardId: rcT.id, memberName: "Michelle Tan", date: "2023-12-12", hours: "20.00", phase: "Document Production",     description: "Responding to SingCo document requests and further review rounds" },
    { caseId, rateCardId: rcN.id, memberName: "Rachel Ng",    date: "2023-12-18", hours: "28.00", phase: "Document Production",     description: "Second-pass review and production of agreed disclosed documents" },
    // Statement of Claim (Dec 2023 - Jan 2024)
    { caseId, rateCardId: rcL.id, memberName: "David Lim",    date: "2023-12-08", hours: "22.00", phase: "Written Submissions",     description: "Drafting Statement of Claim — liability analysis and factual matrix" },
    { caseId, rateCardId: rcT.id, memberName: "Michelle Tan", date: "2023-12-22", hours: "35.00", phase: "Written Submissions",     description: "Research and drafting — breach of SHA and fiduciary duties section" },
    { caseId, rateCardId: rcL.id, memberName: "David Lim",    date: "2024-01-08", hours: "20.00", phase: "Written Submissions",     description: "Revising SOC — quantum section, expert instructions and remedy analysis" },
    { caseId, rateCardId: rcT.id, memberName: "Michelle Tan", date: "2024-01-15", hours: "30.00", phase: "Written Submissions",     description: "Exhibits bundle, footnotes and revising SOC draft for filing" },
    { caseId, rateCardId: rcN.id, memberName: "Rachel Ng",    date: "2024-01-22", hours: "28.00", phase: "Written Submissions",     description: "Exhibits index, SOC footnote verification and filing preparation" },
    // Reply Memorial (Apr-May 2024)
    { caseId, rateCardId: rcL.id, memberName: "David Lim",    date: "2024-04-10", hours: "14.00", phase: "Written Submissions",     description: "Analysis of Counter-Memorial, strategy and Reply Memorial structure" },
    { caseId, rateCardId: rcT.id, memberName: "Michelle Tan", date: "2024-04-18", hours: "22.00", phase: "Written Submissions",     description: "Research for Reply — addressing SingCo's valuation and causation arguments" },
    { caseId, rateCardId: rcN.id, memberName: "Rachel Ng",    date: "2024-04-25", hours: "16.00", phase: "Written Submissions",     description: "Supporting research and exhibits update for Reply Memorial" },
    { caseId, rateCardId: rcL.id, memberName: "David Lim",    date: "2024-05-08", hours: "22.00", phase: "Written Submissions",     description: "Drafting and revising Reply Memorial for filing" },
    { caseId, rateCardId: rcT.id, memberName: "Michelle Tan", date: "2024-05-15", hours: "24.00", phase: "Written Submissions",     description: "Revising Reply and coordinating expert report on loss of profits" },
    // Hearing preparation (Sep-Oct 2024)
    { caseId, rateCardId: rcL.id, memberName: "David Lim",    date: "2024-09-10", hours: "20.00", phase: "Hearing Preparation",     description: "Cross-examination outlines for SingCo witnesses and expert deponents" },
    { caseId, rateCardId: rcT.id, memberName: "Michelle Tan", date: "2024-09-18", hours: "20.00", phase: "Hearing Preparation",     description: "Hearing bundle preparation and witness statement review" },
    { caseId, rateCardId: rcN.id, memberName: "Rachel Ng",    date: "2024-09-25", hours: "18.00", phase: "Hearing Preparation",     description: "Hearing bundle preparation — tabbing, indexing and agreed bundle index" },
    { caseId, rateCardId: rcL.id, memberName: "David Lim",    date: "2024-10-02", hours: "18.00", phase: "Hearing Preparation",     description: "Pre-hearing moot, finalising opening submissions and time allocation" },
    { caseId, rateCardId: rcT.id, memberName: "Michelle Tan", date: "2024-10-05", hours: "12.00", phase: "Hearing Preparation",     description: "Pre-hearing logistics and agreed hearing bundle finalisation" },
    // Merits Hearing (Oct 14-17, 2024, 4 days)
    { caseId, rateCardId: rcL.id, memberName: "David Lim",    date: "2024-10-14", hours: "32.00", phase: "Hearing",                 description: "Merits hearing attendance and advocacy — Days 1 to 4 (4 × 8h)" },
    { caseId, rateCardId: rcT.id, memberName: "Michelle Tan", date: "2024-10-14", hours: "32.00", phase: "Hearing",                 description: "Hearing attendance, real-time notes and document retrieval — Days 1 to 4" },
    { caseId, rateCardId: rcN.id, memberName: "Rachel Ng",    date: "2024-10-14", hours: "24.00", phase: "Hearing",                 description: "Hearing support — real-time exhibit management and daily notes" },
    // Post-hearing briefs (Nov-Dec 2024)
    { caseId, rateCardId: rcL.id, memberName: "David Lim",    date: "2024-11-12", hours: "14.00", phase: "Written Submissions",     description: "Drafting post-hearing brief — liability and causation section" },
    { caseId, rateCardId: rcT.id, memberName: "Michelle Tan", date: "2024-11-20", hours: "20.00", phase: "Written Submissions",     description: "Research and drafting — quantum section of post-hearing brief" },
    { caseId, rateCardId: rcL.id, memberName: "David Lim",    date: "2024-12-03", hours: "12.00", phase: "Written Submissions",     description: "Revising and finalising post-hearing brief for submission" },
    { caseId, rateCardId: rcT.id, memberName: "Michelle Tan", date: "2024-12-10", hours: "14.00", phase: "Written Submissions",     description: "Final revisions to PHB and filing preparation" },
    // Costs submissions (Jan-Apr 2026)
    { caseId, rateCardId: rcL.id, memberName: "David Lim",    date: "2026-02-12", hours: "10.00", phase: "General Case Management", description: "Costs schedule preparation and legal fees analysis for costs submissions" },
    { caseId, rateCardId: rcT.id, memberName: "Michelle Tan", date: "2026-02-20", hours: "12.00", phase: "General Case Management", description: "Cost schedule — time entry verification and phase categorisation" },
    { caseId, rateCardId: rcL.id, memberName: "David Lim",    date: "2026-03-18", hours: "8.00",  phase: "Written Submissions",     description: "Drafting costs submissions — legal fees and disbursements section" },
    { caseId, rateCardId: rcT.id, memberName: "Michelle Tan", date: "2026-03-25", hours: "10.00", phase: "Written Submissions",     description: "Revising costs submissions and disbursement schedule" },
  ]);

  await db.insert(disbursementsTable).values([
    { caseId, category: "Translation", amount: "4200.00",  currency: "SGD", date: "2024-01-25", description: "Translation of JV documentation and board minutes from Mandarin",    party: "Claimant" },
    { caseId, category: "Expert Fees", amount: "52000.00", currency: "SGD", date: "2024-02-01", description: "Prof. E. Reyes (CPA) — expert report on loss of profits and quantum", party: "Claimant" },
    { caseId, category: "Venue",       amount: "12000.00", currency: "SGD", date: "2024-10-10", description: "Maxwell Chambers — hearing room hire, 4 days (14–17 October 2024)",  party: "Claimant" },
    { caseId, category: "Travel",      amount: "3840.00",  currency: "SGD", date: "2024-10-12", description: "Economy return flights and accommodation — Singapore merits hearing",  party: "Claimant" },
    { caseId, category: "Technology",  amount: "2800.00",  currency: "SGD", date: "2024-10-14", description: "Transcript and e-filing services — merits hearing 4 days",            party: "Claimant" },
  ]);
}
