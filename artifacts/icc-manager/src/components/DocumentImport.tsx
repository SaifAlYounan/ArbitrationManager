import { useState, useCallback, useRef } from "react";
import {
  X, Upload, FileText, Loader2, CheckCircle2, AlertCircle,
  ChevronDown, ChevronUp, Calendar, Sparkles, Check, ArrowRight,
  PlusCircle, RefreshCw, MinusCircle,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListDeadlinesQueryKey } from "@workspace/api-client-react";

interface ExistingDeadline { id: number; description: string; dueDate: string | null; }
type ChangeKind = "new" | "update" | "same";

interface DeadlineProposal {
  _id: string;
  checked: boolean;
  kind: ChangeKind;
  existingId?: number;
  existingDate?: string | null;
  description: string;
  responsibleParty: "Claimant" | "Respondent" | "Tribunal" | "All";
  dueDate: string | null;
  notes: string | null;
}

interface DocResult {
  fileName: string;
  documentType: string;
  summary: string;
  notes: string;
  error?: string;
  deadlines: DeadlineProposal[];
}

type Step = "upload" | "analyzing" | "review" | "applying" | "done" | "nochange";

const uid = () => Math.random().toString(36).slice(2);

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

function matchDeadline(proposal: string, existing: ExistingDeadline[]): ExistingDeadline | undefined {
  const p = norm(proposal);
  return existing.find(e => {
    const n = norm(e.description);
    return n === p || n.includes(p) || p.includes(n);
  });
}

/* ── Sample document ──────────────────────────────────────────────────────── */
const SAMPLE_DOCUMENT_NAME = "ICC-Amended-Timetable-PO2.txt";
const SAMPLE_DOCUMENT_CONTENT = `PROCEDURAL ORDER NO. 2 — AMENDED TIMETABLE

In the matter of ICC Arbitration Case No. ICC/2024/ARB-8871

Global Maritime Holdings Ltd v. Zenith Shipping SA

Issued: 18 March 2026

Following the joint application of both parties dated 10 March 2026 requesting
an extension to the procedural timetable, and having reviewed the reasons
advanced by the parties, THE TRIBUNAL hereby orders as follows:

1. AMENDED TIMETABLE

The timetable established under Procedural Order No. 1 is hereby amended.
The following revised dates shall apply:

  Respondent Counter-Memorial           — 30 June 2026       (Respondent)
  Claimant Reply Memorial               — 15 September 2026  (Claimant)
  Respondent Rejoinder                  — 28 November 2026   (Respondent)
  Pre-Hearing Submissions               — 28 February 2027   (All)
  Hearing on Merits                     — 7 April 2027       (All)

2. REASONS

2.1 The Respondent has demonstrated good cause for the extension, citing the
    volume of documentary disclosure and the need to obtain expert evidence.

2.2 The Claimant does not oppose the revised timetable.

2.3 All other terms of Procedural Order No. 1 remain in full force.

3. COSTS

Costs of this application are reserved to the final award.

By order of the Tribunal.
`;

function makeSampleFile(): File {
  return new File([SAMPLE_DOCUMENT_CONTENT], SAMPLE_DOCUMENT_NAME, { type: "text/plain" });
}

/* ── UI helpers ───────────────────────────────────────────────────────────── */
function Section({
  title, icon, color, count, children,
}: { title: string; icon: React.ReactNode; color: string; count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  if (count === 0) return null;
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className={`w-full flex items-center justify-between px-4 py-3 ${color} text-left`}>
        <div className="flex items-center gap-2 font-semibold text-sm">
          {icon}
          {title}
          <span className="ml-1 px-2 py-0.5 bg-white/30 rounded-full text-xs">{count}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 opacity-70" /> : <ChevronDown className="w-4 h-4 opacity-70" />}
      </button>
      {open && <div className="divide-y divide-gray-100">{children}</div>}
    </div>
  );
}

function KindBadge({ kind }: { kind: ChangeKind }) {
  if (kind === "new") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
      <PlusCircle className="w-2.5 h-2.5" /> New
    </span>
  );
  if (kind === "update") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
      <RefreshCw className="w-2.5 h-2.5" /> Update
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
      <MinusCircle className="w-2.5 h-2.5" /> No change
    </span>
  );
}

function DeadlineRow({
  dl, onChange,
}: { dl: DeadlineProposal; onChange: (v: boolean) => void }) {
  const isDisabled = dl.kind === "same";
  return (
    <label className={`flex items-start gap-3 px-4 py-3 ${isDisabled ? "opacity-50" : "hover:bg-gray-50 cursor-pointer"}`}>
      <div
        className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
          isDisabled ? "border-gray-200 bg-gray-100 cursor-not-allowed"
          : dl.checked ? "bg-[#0F2547] border-[#0F2547]" : "border-gray-300"
        }`}
        onClick={() => !isDisabled && onChange(!dl.checked)}
      >
        {dl.checked && !isDisabled && <Check className="w-3 h-3 text-white" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <p className="text-sm font-medium text-gray-900 leading-snug">{dl.description}</p>
          <KindBadge kind={dl.kind} />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 flex-wrap">
          <span>{dl.responsibleParty}</span>
          {dl.kind === "update" && dl.existingDate ? (
            <>
              <span className="line-through text-gray-400">{dl.existingDate}</span>
              <ArrowRight className="w-3 h-3 text-amber-500 flex-shrink-0" />
              <span className="text-amber-700 font-medium">{dl.dueDate}</span>
            </>
          ) : dl.dueDate ? (
            <span>{dl.dueDate}</span>
          ) : null}
          {dl.notes && <span>· {dl.notes}</span>}
        </div>
      </div>
    </label>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */
export default function DocumentImport({
  caseId, caseName, onClose,
}: { caseId: number; caseName?: string; onClose: () => void }) {
  const [step, setStep] = useState<Step>("upload");
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<DocResult[]>([]);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [addedCount, setAddedCount] = useState(0);
  const [updatedCount, setUpdatedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const arr = Array.from(incoming).filter(f => f.name.match(/\.(pdf|txt|md|docx)$/i));
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size));
      return [...prev, ...arr.filter(f => !existing.has(f.name + f.size))];
    });
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const analyse = async () => {
    if (!files.length) return;
    setStep("analyzing");

    // Fetch AI results and existing deadlines in parallel
    const fd = new FormData();
    files.forEach(f => fd.append("files", f));

    try {
      const [analysisRes, deadlinesRes] = await Promise.all([
        fetch("/api/analyze-document", { method: "POST", body: fd }),
        fetch(`/api/cases/${caseId}/deadlines`),
      ]);

      if (!analysisRes.ok) throw new Error(await analysisRes.text());
      const analysisData = await analysisRes.json();

      let existingDeadlines: ExistingDeadline[] = [];
      if (deadlinesRes.ok) {
        const rawDeadlines = await deadlinesRes.json();
        existingDeadlines = (Array.isArray(rawDeadlines) ? rawDeadlines : []).map((d: {id: number; description: string; dueDate: string | null}) => ({
          id: d.id,
          description: d.description,
          dueDate: d.dueDate,
        }));
      }

      const enriched: DocResult[] = (analysisData.proposals as DocResult[]).map(doc => ({
        ...doc,
        deadlines: (doc.deadlines ?? []).map((d: Omit<DeadlineProposal, "_id" | "checked" | "kind" | "existingId" | "existingDate">) => {
          const match = matchDeadline(d.description, existingDeadlines);
          let kind: ChangeKind = "new";
          let existingId: number | undefined;
          let existingDate: string | null | undefined;

          if (match) {
            existingId = match.id;
            existingDate = match.dueDate;
            const sameDate = norm(match.dueDate ?? "") === norm(d.dueDate ?? "");
            kind = sameDate ? "same" : "update";
          }

          return {
            ...d,
            _id: uid(),
            checked: kind !== "same",
            kind,
            existingId,
            existingDate,
          };
        }),
      }));

      setResults(enriched);

      // If every deadline across all docs is "same", skip to no-change state
      const allSame = enriched.every(doc => doc.deadlines.every(d => d.kind === "same"));
      if (allSame && enriched.every(doc => !doc.error && doc.deadlines.length > 0)) {
        setStep("nochange");
      } else {
        setStep("review");
      }
    } catch (err) {
      setResults([{
        fileName: "Error", documentType: "", summary: "", notes: "",
        error: String(err), deadlines: [],
      }]);
      setStep("review");
    }
  };

  const toggleItem = (docIdx: number, id: string) => {
    setResults(prev => prev.map((doc, i) => {
      if (i !== docIdx) return doc;
      return {
        ...doc,
        deadlines: doc.deadlines.map(item =>
          item._id === id ? { ...item, checked: !item.checked } : item
        ),
      };
    }));
  };

  const toggleAll = (docIdx: number, val: boolean) => {
    setResults(prev => prev.map((doc, i) => i !== docIdx ? doc : {
      ...doc,
      deadlines: doc.deadlines.map(item =>
        item.kind === "same" ? item : { ...item, checked: val }
      ),
    }));
  };

  const totalChecked = results.reduce((sum, doc) =>
    sum + doc.deadlines.filter(d => d.checked && d.kind !== "same").length, 0);

  const apply = async () => {
    setStep("applying");
    setApplyError(null);
    let added = 0;
    let updated = 0;
    try {
      for (const doc of results) {
        for (const dl of doc.deadlines.filter(d => d.checked && d.kind !== "same")) {
          if (dl.kind === "update" && dl.existingId) {
            await fetch(`/api/cases/${caseId}/deadlines/${dl.existingId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                description: dl.description,
                responsibleParty: dl.responsibleParty,
                dueDate: dl.dueDate ?? undefined,
                notes: dl.notes ?? undefined,
                status: "Pending",
              }),
            });
            updated++;
          } else {
            await fetch(`/api/cases/${caseId}/deadlines`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                description: dl.description,
                responsibleParty: dl.responsibleParty,
                dueDate: dl.dueDate ?? undefined,
                notes: dl.notes ?? undefined,
                status: "Pending",
              }),
            });
            added++;
          }
        }
      }
      qc.invalidateQueries({ queryKey: getListDeadlinesQueryKey(caseId) });
      setAddedCount(added);
      setUpdatedCount(updated);
      setStep("done");
    } catch (err) {
      setApplyError(String(err));
      setStep("review");
    }
  };

  const stepIndex = { upload: 0, analyzing: 0, review: 1, applying: 1, done: 2, nochange: 2 }[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0F2547] text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-blue-200" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Smart Document Import</h2>
              {caseName ? (
                <p className="text-xs text-blue-300 truncate max-w-[340px]">{caseName}</p>
              ) : (
                <p className="text-xs text-blue-300">AI-powered case data extraction</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-0 px-6 py-3 bg-gray-50 border-b border-gray-100 flex-shrink-0">
          {(["Upload", "Review", "Done"] as const).map((label, i) => {
            const active = stepIndex === i;
            const past = stepIndex > i;
            return (
              <div key={label} className="flex items-center gap-0">
                {i > 0 && <div className={`h-0.5 w-8 ${past ? "bg-[#0F2547]" : "bg-gray-200"}`} />}
                <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${active ? "text-[#0F2547]" : past ? "text-green-700" : "text-gray-400"}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${active ? "bg-[#0F2547] text-white" : past ? "bg-green-600 text-white" : "bg-gray-200 text-gray-500"}`}>
                    {past ? <Check className="w-3 h-3" /> : i + 1}
                  </div>
                  {label}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* ── UPLOAD ── */}
          {(step === "upload" || step === "analyzing") && (
            <div className="p-6 space-y-4">
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragOver ? "border-[#0F2547] bg-blue-50" : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"}`}
              >
                <Upload className="w-8 h-8 mx-auto mb-3 text-gray-400" />
                <p className="font-medium text-gray-700">Drop a document here</p>
                <p className="text-sm text-gray-500 mt-1">PDF, TXT, MD files · Up to 20 MB</p>
                <button className="mt-3 text-sm text-[#0F2547] font-medium underline underline-offset-2">Browse files</button>
                <input ref={fileInputRef} type="file" multiple accept=".pdf,.txt,.md,.docx" className="hidden" onChange={e => e.target.files && addFiles(e.target.files)} />
              </div>

              {step === "upload" && files.length === 0 && (
                <>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400 flex-shrink-0">or try an example</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  <button
                    onClick={() => addFiles([makeSampleFile()])}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 transition-colors text-left group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#0F2547]/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-[#0F2547]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#0F2547]">Load sample document</p>
                      <p className="text-xs text-blue-600 mt-0.5">PO No. 2 — amended procedural timetable for Global Maritime</p>
                    </div>
                    <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0 group-hover:text-[#0F2547] transition-colors" />
                  </button>
                </>
              )}

              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                      <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700 flex-1 truncate">{f.name}</span>
                      <span className="text-xs text-gray-400">{(f.size / 1024).toFixed(0)} KB</span>
                      {step === "upload" && (
                        <button onClick={e => { e.stopPropagation(); removeFile(i); }} className="p-0.5 rounded hover:bg-gray-200 text-gray-400">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {step === "analyzing" && (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <div className="relative">
                    <Loader2 className="w-10 h-10 text-[#0F2547] animate-spin" />
                    <Sparkles className="w-4 h-4 text-blue-400 absolute -top-1 -right-1" />
                  </div>
                  <p className="font-medium text-gray-800">Analysing document…</p>
                  <p className="text-sm text-gray-500">Extracting deadlines and comparing with case record</p>
                </div>
              )}
            </div>
          )}

          {/* ── REVIEW ── */}
          {(step === "review" || step === "applying") && (
            <div className="p-6 space-y-5">
              {applyError && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p>{applyError}</p>
                </div>
              )}

              {results.map((doc, docIdx) => (
                <div key={docIdx} className="space-y-3">
                  {results.length > 1 && (
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-700 truncate">{doc.fileName}</span>
                    </div>
                  )}

                  {doc.error ? (
                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <p>{doc.error}</p>
                    </div>
                  ) : (
                    <>
                      {doc.summary && (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                          <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1">{doc.documentType}</p>
                          <p className="text-sm text-blue-900 leading-relaxed">{doc.summary}</p>
                        </div>
                      )}

                      <Section
                        title="Deadlines"
                        icon={<Calendar className="w-4 h-4" />}
                        color="bg-orange-50 text-orange-800"
                        count={doc.deadlines.length}
                      >
                        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
                          <span className="text-xs text-gray-500">
                            {doc.deadlines.filter(d => d.checked).length} of {doc.deadlines.filter(d => d.kind !== "same").length} changes selected
                          </span>
                          <div className="flex gap-2">
                            <button onClick={() => toggleAll(docIdx, true)} className="text-xs text-[#0F2547] hover:underline">All</button>
                            <button onClick={() => toggleAll(docIdx, false)} className="text-xs text-gray-400 hover:underline">None</button>
                          </div>
                        </div>
                        {doc.deadlines.map(dl => (
                          <DeadlineRow
                            key={dl._id}
                            dl={dl}
                            onChange={v => { dl.checked = v; toggleItem(docIdx, dl._id); }}
                          />
                        ))}
                      </Section>

                      {doc.deadlines.length === 0 && (
                        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-600">
                          <AlertCircle className="w-4 h-4 text-gray-400" />
                          No deadline data found in this document.
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── NO CHANGE ── */}
          {step === "nochange" && (
            <div className="p-8 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-gray-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">No changes required</h3>
                <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
                  All deadlines from this document are already recorded in the case with matching dates.
                </p>
              </div>
            </div>
          )}

          {/* ── DONE ── */}
          {step === "done" && (
            <div className="p-8 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Case record updated</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {[
                    updatedCount > 0 && `${updatedCount} deadline${updatedCount !== 1 ? "s" : ""} updated`,
                    addedCount > 0 && `${addedCount} deadline${addedCount !== 1 ? "s" : ""} added`,
                  ].filter(Boolean).join(" · ")}
                </p>
                <p className="text-xs text-gray-400 mt-1">Review the Deadlines tab to confirm.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-gray-50">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
            {step === "done" || step === "nochange" ? "Close" : "Cancel"}
          </button>

          {step === "upload" && (
            <button
              onClick={analyse}
              disabled={files.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#0F2547] text-white text-sm font-medium hover:bg-[#1e3a6e] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Analyse {files.length > 0 ? `${files.length} file${files.length !== 1 ? "s" : ""}` : "Document"}
            </button>
          )}

          {step === "review" && totalChecked > 0 && (
            <button
              onClick={apply}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#0F2547] text-white text-sm font-medium hover:bg-[#1e3a6e] transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Apply {totalChecked} change{totalChecked !== 1 ? "s" : ""}
            </button>
          )}

          {step === "applying" && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Applying…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
