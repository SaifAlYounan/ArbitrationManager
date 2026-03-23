import { pgTable, text, serial, timestamp, integer, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const casesTable = pgTable("cases", {
  id: serial("id").primaryKey(),
  caseReference: text("case_reference").notNull(),
  caseName: text("case_name").notNull(),
  claimants: text("claimants").notNull(),
  respondents: text("respondents").notNull(),
  seatOfArbitration: text("seat_of_arbitration").notNull(),
  languageOfArbitration: text("language_of_arbitration").notNull(),
  applicableRules: text("applicable_rules").notNull(),
  dateOfRequest: text("date_of_request").notNull(),
  currency: text("currency").notNull(),
  status: text("status").notNull().default("Active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCaseSchema = createInsertSchema(casesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCase = z.infer<typeof insertCaseSchema>;
export type Case = typeof casesTable.$inferSelect;

export const tribunalMembersTable = pgTable("tribunal_members", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull().references(() => casesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role").notNull(),
  email: text("email").notNull(),
  timeZone: text("time_zone").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTribunalMemberSchema = createInsertSchema(tribunalMembersTable).omit({ id: true, createdAt: true });
export type InsertTribunalMember = z.infer<typeof insertTribunalMemberSchema>;
export type TribunalMember = typeof tribunalMembersTable.$inferSelect;

export const representativesTable = pgTable("representatives", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull().references(() => casesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  firm: text("firm").notNull(),
  role: text("role").notNull(),
  party: text("party").notNull(),
  email: text("email").notNull(),
  timeZone: text("time_zone").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRepresentativeSchema = createInsertSchema(representativesTable).omit({ id: true, createdAt: true });
export type InsertRepresentative = z.infer<typeof insertRepresentativeSchema>;
export type Representative = typeof representativesTable.$inferSelect;

export const deadlinesTable = pgTable("deadlines", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull().references(() => casesTable.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  responsibleParty: text("responsible_party").notNull(),
  dueDate: text("due_date").notNull(),
  originalDueDate: text("original_due_date"),
  status: text("status").notNull().default("Pending"),
  proceduralOrderRef: text("procedural_order_ref"),
  extensionOrderRef: text("extension_order_ref"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDeadlineSchema = createInsertSchema(deadlinesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDeadline = z.infer<typeof insertDeadlineSchema>;
export type Deadline = typeof deadlinesTable.$inferSelect;

export const proceduralOrdersTable = pgTable("procedural_orders", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull().references(() => casesTable.id, { onDelete: "cascade" }),
  poNumber: text("po_number").notNull(),
  dateIssued: text("date_issued").notNull(),
  summary: text("summary").notNull(),
  draftContent: text("draft_content"),
  formattedContent: text("formatted_content"),
  isFinalized: boolean("is_finalized").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProceduralOrderSchema = createInsertSchema(proceduralOrdersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProceduralOrder = z.infer<typeof insertProceduralOrderSchema>;
export type ProceduralOrder = typeof proceduralOrdersTable.$inferSelect;

export const hearingsTable = pgTable("hearings", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull().references(() => casesTable.id, { onDelete: "cascade" }),
  hearingType: text("hearing_type").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  location: text("location").notNull(),
  isVirtual: boolean("is_virtual").notNull().default(false),
  platform: text("platform"),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  timezoneOfRecord: text("timezone_of_record").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertHearingSchema = createInsertSchema(hearingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertHearing = z.infer<typeof insertHearingSchema>;
export type Hearing = typeof hearingsTable.$inferSelect;

export const hearingParticipantsTable = pgTable("hearing_participants", {
  id: serial("id").primaryKey(),
  hearingId: integer("hearing_id").notNull().references(() => hearingsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role").notNull(),
  timezone: text("timezone").notNull(),
  attendance: text("attendance").notNull().default("In Person"),
  attendingDays: text("attending_days").notNull().default("[]"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertHearingParticipantSchema = createInsertSchema(hearingParticipantsTable).omit({ id: true, createdAt: true });
export type InsertHearingParticipant = z.infer<typeof insertHearingParticipantSchema>;
export type HearingParticipant = typeof hearingParticipantsTable.$inferSelect;

export const witnessScheduleTable = pgTable("witness_schedule", {
  id: serial("id").primaryKey(),
  hearingId: integer("hearing_id").notNull().references(() => hearingsTable.id, { onDelete: "cascade" }),
  witnessName: text("witness_name").notNull(),
  witnessRole: text("witness_role").notNull().default("Witness"),
  hearingDay: text("hearing_day").notNull(),
  chiefExamMins: integer("chief_exam_mins").notNull().default(0),
  crossExamMins: integer("cross_exam_mins").notNull().default(0),
  examiningCounsel: text("examining_counsel"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWitnessScheduleSchema = createInsertSchema(witnessScheduleTable).omit({ id: true, createdAt: true });
export type InsertWitnessSchedule = z.infer<typeof insertWitnessScheduleSchema>;
export type WitnessSchedule = typeof witnessScheduleTable.$inferSelect;

export const hearingChecklistTable = pgTable("hearing_checklist", {
  id: serial("id").primaryKey(),
  hearingId: integer("hearing_id").notNull().references(() => hearingsTable.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  isDone: boolean("is_done").notNull().default(false),
  doneDate: text("done_date"),
  notes: text("notes"),
  isCustom: boolean("is_custom").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertHearingChecklistSchema = createInsertSchema(hearingChecklistTable).omit({ id: true, createdAt: true });
export type InsertHearingChecklist = z.infer<typeof insertHearingChecklistSchema>;
export type HearingChecklist = typeof hearingChecklistTable.$inferSelect;

export const rateCardTable = pgTable("rate_card", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull().references(() => casesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role").notNull(),
  hourlyRate: numeric("hourly_rate", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  party: text("party").notNull().default("Claimant"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const insertRateCardSchema = createInsertSchema(rateCardTable).omit({ id: true, createdAt: true });
export type InsertRateCard = z.infer<typeof insertRateCardSchema>;
export type RateCard = typeof rateCardTable.$inferSelect;

export const timeEntriesTable = pgTable("time_entries", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull().references(() => casesTable.id, { onDelete: "cascade" }),
  rateCardId: integer("rate_card_id").references(() => rateCardTable.id, { onDelete: "set null" }),
  memberName: text("member_name").notNull(),
  date: text("date").notNull(),
  hours: numeric("hours", { precision: 6, scale: 2 }).notNull(),
  phase: text("phase").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const insertTimeEntrySchema = createInsertSchema(timeEntriesTable).omit({ id: true, createdAt: true });
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
export type TimeEntry = typeof timeEntriesTable.$inferSelect;

export const disbursementsTable = pgTable("disbursements", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull().references(() => casesTable.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  date: text("date").notNull(),
  description: text("description").notNull(),
  docRef: text("doc_ref"),
  party: text("party").notNull().default("Claimant"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const insertDisbursementSchema = createInsertSchema(disbursementsTable).omit({ id: true, createdAt: true });
export type InsertDisbursement = z.infer<typeof insertDisbursementSchema>;
export type Disbursement = typeof disbursementsTable.$inferSelect;

export const costsSettingsTable = pgTable("costs_settings", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull().unique().references(() => casesTable.id, { onDelete: "cascade" }),
  iccAdvanceAmount: numeric("icc_advance_amount", { precision: 12, scale: 2 }),
  iccCurrency: text("icc_currency").notNull().default("USD"),
  claimantPaid: numeric("claimant_paid", { precision: 12, scale: 2 }).notNull().default("0"),
  respondentPaid: numeric("respondent_paid", { precision: 12, scale: 2 }).notNull().default("0"),
  totalBudget: numeric("total_budget", { precision: 12, scale: 2 }),
  budgetCurrency: text("budget_currency").notNull().default("USD"),
  notes: text("notes"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
export const insertCostsSettingsSchema = createInsertSchema(costsSettingsTable).omit({ id: true });
export type InsertCostsSettings = z.infer<typeof insertCostsSettingsSchema>;
export type CostsSettings = typeof costsSettingsTable.$inferSelect;
