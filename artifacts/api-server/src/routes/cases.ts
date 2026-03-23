import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, casesTable, tribunalMembersTable, representativesTable } from "@workspace/db";
import {
  ListCasesResponse,
  CreateCaseBody,
  GetCaseParams,
  GetCaseResponse,
  UpdateCaseParams,
  UpdateCaseBody,
  UpdateCaseResponse,
  ListTribunalMembersParams,
  ListTribunalMembersResponse,
  AddTribunalMemberParams,
  AddTribunalMemberBody,
  UpdateTribunalMemberParams,
  UpdateTribunalMemberBody,
  UpdateTribunalMemberResponse,
  DeleteTribunalMemberParams,
  ListRepresentativesParams,
  ListRepresentativesResponse,
  AddRepresentativeParams,
  AddRepresentativeBody,
  UpdateRepresentativeParams,
  UpdateRepresentativeBody,
  UpdateRepresentativeResponse,
  DeleteRepresentativeParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/cases", async (req, res): Promise<void> => {
  const cases = await db.select().from(casesTable).orderBy(casesTable.createdAt);
  res.json(ListCasesResponse.parse(cases));
});

router.post("/cases", async (req, res): Promise<void> => {
  const parsed = CreateCaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [newCase] = await db.insert(casesTable).values({
    ...parsed.data,
    status: parsed.data.status ?? "Active",
  }).returning();
  res.status(201).json(GetCaseResponse.parse({ ...newCase, tribunalMembers: [], representatives: [] }));
});

router.get("/cases/:id", async (req, res): Promise<void> => {
  const params = GetCaseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [caseRow] = await db.select().from(casesTable).where(eq(casesTable.id, params.data.id));
  if (!caseRow) {
    res.status(404).json({ error: "Case not found" });
    return;
  }
  const tribunalMembers = await db.select().from(tribunalMembersTable).where(eq(tribunalMembersTable.caseId, caseRow.id));
  const representatives = await db.select().from(representativesTable).where(eq(representativesTable.caseId, caseRow.id));
  res.json(GetCaseResponse.parse({ ...caseRow, tribunalMembers, representatives }));
});

router.put("/cases/:id", async (req, res): Promise<void> => {
  const params = UpdateCaseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateCaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db.update(casesTable).set(parsed.data).where(eq(casesTable.id, params.data.id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Case not found" });
    return;
  }
  res.json(UpdateCaseResponse.parse(updated));
});

router.get("/cases/:caseId/tribunal", async (req, res): Promise<void> => {
  const params = ListTribunalMembersParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const members = await db.select().from(tribunalMembersTable).where(eq(tribunalMembersTable.caseId, params.data.caseId));
  res.json(ListTribunalMembersResponse.parse(members));
});

router.post("/cases/:caseId/tribunal", async (req, res): Promise<void> => {
  const params = AddTribunalMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = AddTribunalMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [member] = await db.insert(tribunalMembersTable).values({ ...parsed.data, caseId: params.data.caseId }).returning();
  res.status(201).json(member);
});

router.put("/cases/:caseId/tribunal/:memberId", async (req, res): Promise<void> => {
  const params = UpdateTribunalMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTribunalMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db.update(tribunalMembersTable).set(parsed.data).where(eq(tribunalMembersTable.id, params.data.memberId)).returning();
  if (!updated) {
    res.status(404).json({ error: "Tribunal member not found" });
    return;
  }
  res.json(UpdateTribunalMemberResponse.parse(updated));
});

router.delete("/cases/:caseId/tribunal/:memberId", async (req, res): Promise<void> => {
  const params = DeleteTribunalMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db.delete(tribunalMembersTable).where(eq(tribunalMembersTable.id, params.data.memberId)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Tribunal member not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/cases/:caseId/representatives", async (req, res): Promise<void> => {
  const params = ListRepresentativesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const reps = await db.select().from(representativesTable).where(eq(representativesTable.caseId, params.data.caseId));
  res.json(ListRepresentativesResponse.parse(reps));
});

router.post("/cases/:caseId/representatives", async (req, res): Promise<void> => {
  const params = AddRepresentativeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = AddRepresentativeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [rep] = await db.insert(representativesTable).values({ ...parsed.data, caseId: params.data.caseId }).returning();
  res.status(201).json(rep);
});

router.put("/cases/:caseId/representatives/:repId", async (req, res): Promise<void> => {
  const params = UpdateRepresentativeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateRepresentativeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db.update(representativesTable).set(parsed.data).where(eq(representativesTable.id, params.data.repId)).returning();
  if (!updated) {
    res.status(404).json({ error: "Representative not found" });
    return;
  }
  res.json(UpdateRepresentativeResponse.parse(updated));
});

router.delete("/cases/:caseId/representatives/:repId", async (req, res): Promise<void> => {
  const params = DeleteRepresentativeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db.delete(representativesTable).where(eq(representativesTable.id, params.data.repId)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Representative not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
