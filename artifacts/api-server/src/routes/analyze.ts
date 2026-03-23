import { Router, Request, Response } from "express";
import multer from "multer";
import pdfParse from "pdf-parse";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

async function extractText(file: Express.Multer.File): Promise<string> {
  const name = file.originalname.toLowerCase();
  if (name.endsWith(".pdf")) {
    const data = await pdfParse(file.buffer);
    return data.text;
  }
  if (name.endsWith(".txt") || name.endsWith(".md")) {
    return file.buffer.toString("utf-8");
  }
  return file.buffer.toString("utf-8");
}

const SYSTEM_PROMPT = `You are an expert assistant specialising in international arbitration case management. 
You analyse legal documents (requests for arbitration, procedural orders, correspondence, exhibits, memorials, etc.) 
and extract structured case data.

Return ONLY valid JSON — no markdown fences, no commentary, just the raw JSON object.

The JSON must follow this exact shape:
{
  "documentType": "string describing the document type",
  "summary": "1-2 sentence summary of the document",
  "exhibits": [
    {
      "party": "Claimant" | "Respondent",
      "description": "concise description of the document as an exhibit",
      "date": "YYYY-MM-DD or null",
      "status": "Filed" | "Pending" | "Agreed" | "Disputed"
    }
  ],
  "deadlines": [
    {
      "description": "description of the deadline or procedural step",
      "responsibleParty": "Claimant" | "Respondent" | "Tribunal" | "All",
      "dueDate": "YYYY-MM-DD or null",
      "notes": "any relevant notes or null"
    }
  ],
  "proceduralOrders": [
    {
      "poNumber": "PO-1 etc or null",
      "dateIssued": "YYYY-MM-DD or null",
      "summary": "concise summary of the PO directions"
    }
  ],
  "caseInfo": {
    "caseReference": "extracted reference or null",
    "claimants": "extracted claimant name or null",
    "respondents": "extracted respondent name or null",
    "seatOfArbitration": "extracted seat or null",
    "dateOfRequest": "YYYY-MM-DD or null"
  },
  "notes": "any other important observations about the document"
}

Rules:
- Only include items you have genuine evidence for from the document text.
- If a document IS itself an exhibit (e.g. a contract, expert report, letter), add it as an exhibit proposal.
- If a document contains a procedural timetable, extract each deadline.
- If the document is a procedural order, extract it as a proceduralOrder with its key directions.
- Return empty arrays [] when nothing is found for a category — never omit the keys.
- Dates must be in YYYY-MM-DD format or null.
- Keep descriptions concise but professionally precise (lawyer-quality language).`;

router.post("/api/analyze-document", upload.array("files", 10), async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) {
    return res.status(400).json({ error: "No files uploaded" });
  }

  try {
    const allProposals = [];

    for (const file of files) {
      let text: string;
      try {
        text = await extractText(file);
      } catch {
        text = "";
      }

      if (!text.trim()) {
        allProposals.push({
          fileName: file.originalname,
          error: "Could not extract text from this file",
          exhibits: [],
          deadlines: [],
          proceduralOrders: [],
          caseInfo: null,
          documentType: "Unknown",
          summary: "",
          notes: "",
        });
        continue;
      }

      const truncated = text.slice(0, 40000);

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Analyse the following document and return structured JSON proposals:\n\n---\nFILENAME: ${file.originalname}\n---\n${truncated}`,
          },
        ],
      });

      const block = message.content[0];
      const rawText = block.type === "text" ? block.text.trim() : "{}";

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        const match = rawText.match(/\{[\s\S]*\}/);
        try {
          parsed = match ? JSON.parse(match[0]) : {};
        } catch {
          parsed = {};
        }
      }

      allProposals.push({
        fileName: file.originalname,
        documentType: parsed.documentType ?? "Document",
        summary: parsed.summary ?? "",
        exhibits: (parsed.exhibits as unknown[]) ?? [],
        deadlines: (parsed.deadlines as unknown[]) ?? [],
        proceduralOrders: (parsed.proceduralOrders as unknown[]) ?? [],
        caseInfo: parsed.caseInfo ?? null,
        notes: parsed.notes ?? "",
      });
    }

    res.json({ proposals: allProposals });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "AI analysis failed: " + message });
  }
});

export default router;
