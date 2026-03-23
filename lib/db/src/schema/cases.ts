import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
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
