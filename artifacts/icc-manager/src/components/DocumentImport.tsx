import { useState, useCallback, useRef } from "react";
import {
  X, Upload, FileText, Loader2, CheckCircle2, AlertCircle,
  ChevronDown, ChevronUp, Calendar, FolderOpen, ClipboardList,
  Sparkles, Check, Minus,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListExhibitsQueryKey, getListDeadlinesQueryKey, getListProceduralOrdersQueryKey } from "@workspace/api-client-react";

interface ExhibitProposal { _id: string; checked: boolean; party: "Claimant" | "Respondent"; description: string; date: string | null; status: "Filed" | "Pending" | "Agreed" | "Disputed"; }
interface DeadlineProposal { _id: string; checked: boolean; description: string; responsibleParty: "Claimant" | "Respondent" | "Tribunal" | "All"; dueDate: string | null; notes: string | null; }
interface POProposal { _id: string; checked: boolean; poNumber: string | null; dateIssued: string | null; summary: string; }
interface DocResult {
  fileName: string; documentType: string; summary: string; notes: string; error?: string;
  exhibits: ExhibitProposal[]; deadlines: DeadlineProposal[]; proceduralOrders: POProposal[];
}

type Step = "upload" | "analyzing" | "review" | "applying" | "done";

const uid = () => Math.random().toString(36).slice(2);

function Section({ title, icon, color, count, children }: { title: string; icon: React.ReactNode; color: string; count: number; children: React.ReactNode }) {
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

function ProposalRow({ checked, onChange, label, meta }: { checked: boolean; onChange: (v: boolean) => void; label: string; meta?: string }) {
  return (
    <label className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer">
      <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${checked ? "bg-[#0F2547] border-[#0F2547]" : "border-gray-300"}`} onClick={() => onChange(!checked)}>
        {checked && <Check className="w-3 h-3 text-white" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 leading-snug">{label}</p>
        {meta && <p className="text-xs text-gray-500 mt-0.5">{meta}</p>}
      </div>
    </label>
  );
}

export default function DocumentImport({ caseId, onClose }: { caseId: number; onClose: () => void }) {
  const [step, setStep] = useState<Step>("upload");
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<DocResult[]>([]);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [appliedCount, setAppliedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const arr = Array.from(incoming).filter(f =>
      f.name.match(/\.(pdf|txt|md|docx)$/i)
    );
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
    const fd = new FormData();
    files.forEach(f => fd.append("files", f));
    try {
      const res = await fetch("/api/analyze-document", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const enriched: DocResult[] = (data.proposals as DocResult[]).map(doc => ({
        ...doc,
        exhibits: (doc.exhibits ?? []).map(e => ({ ...e, _id: uid(), checked: true })),
        deadlines: (doc.deadlines ?? []).map(d => ({ ...d, _id: uid(), checked: true })),
        proceduralOrders: (doc.proceduralOrders ?? []).map(p => ({ ...p, _id: uid(), checked: true })),
      }));
      setResults(enriched);
      setStep("review");
    } catch (err) {
      setResults([{ fileName: "Error", documentType: "", summary: "", notes: "", error: String(err), exhibits: [], deadlines: [], proceduralOrders: [] }]);
      setStep("review");
    }
  };

  const toggleItem = (docIdx: number, type: "exhibits" | "deadlines" | "proceduralOrders", id: string) => {
    setResults(prev => prev.map((doc, i) => {
      if (i !== docIdx) return doc;
      return { ...doc, [type]: (doc[type] as { _id: string; checked: boolean }[]).map(item => item._id === id ? { ...item, checked: !item.checked } : item) };
    }));
  };

  const toggleAll = (docIdx: number, type: "exhibits" | "deadlines" | "proceduralOrders", val: boolean) => {
    setResults(prev => prev.map((doc, i) => i !== docIdx ? doc : {
      ...doc, [type]: (doc[type] as { _id: string; checked: boolean }[]).map(item => ({ ...item, checked: val }))
    }));
  };

  const totalChecked = results.reduce((sum, doc) => sum +
    doc.exhibits.filter(e => e.checked).length +
    doc.deadlines.filter(d => d.checked).length +
    doc.proceduralOrders.filter(p => p.checked).length, 0);

  const apply = async () => {
    setStep("applying");
    setApplyError(null);
    let count = 0;
    try {
      for (const doc of results) {
        for (const ex of doc.exhibits.filter(e => e.checked)) {
          await fetch(`/api/cases/${caseId}/exhibits`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ party: ex.party, description: ex.description, date: ex.date ?? undefined, status: ex.status }),
          });
          count++;
        }
        for (const dl of doc.deadlines.filter(d => d.checked)) {
          await fetch(`/api/cases/${caseId}/deadlines`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ description: dl.description, responsibleParty: dl.responsibleParty, dueDate: dl.dueDate ?? undefined, notes: dl.notes ?? undefined, status: "Pending" }),
          });
          count++;
        }
        for (const po of doc.proceduralOrders.filter(p => p.checked)) {
          await fetch(`/api/cases/${caseId}/procedural-orders`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ poNumber: po.poNumber ?? undefined, dateIssued: po.dateIssued ?? undefined, summary: po.summary, isFinalized: false }),
          });
          count++;
        }
      }
      qc.invalidateQueries({ queryKey: getListExhibitsQueryKey(caseId) });
      qc.invalidateQueries({ queryKey: getListDeadlinesQueryKey(caseId) });
      qc.invalidateQueries({ queryKey: getListProceduralOrdersQueryKey(caseId) });
      setAppliedCount(count);
      setStep("done");
    } catch (err) {
      setApplyError(String(err));
      setStep("review");
    }
  };

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
              <p className="text-xs text-blue-300">AI-powered case data extraction</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-0 px-6 py-3 bg-gray-50 border-b border-gray-100 flex-shrink-0">
          {(["upload", "review", "done"] as const).map((s, i) => {
            const labels = ["Upload", "Review", "Done"];
            const active = step === s || (step === "analyzing" && s === "upload") || (step === "applying" && s === "review");
            const past = (step === "review" && i === 0) || (step === "applying" && i <= 1) || (step === "done" && i <= 2);
            return (
              <div key={s} className="flex items-center gap-0">
                {i > 0 && <div className={`h-0.5 w-8 ${past ? "bg-[#0F2547]" : "bg-gray-200"}`} />}
                <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${active ? "text-[#0F2547]" : past ? "text-green-700" : "text-gray-400"}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${active ? "bg-[#0F2547] text-white" : past ? "bg-green-600 text-white" : "bg-gray-200 text-gray-500"}`}>
                    {past && !active ? <Check className="w-3 h-3" /> : i + 1}
                  </div>
                  {labels[i]}
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
                <p className="font-medium text-gray-700">Drop documents here</p>
                <p className="text-sm text-gray-500 mt-1">PDF, TXT, MD files · Up to 20 MB each</p>
                <button className="mt-3 text-sm text-[#0F2547] font-medium underline underline-offset-2">Browse files</button>
                <input ref={fileInputRef} type="file" multiple accept=".pdf,.txt,.md,.docx" className="hidden" onChange={e => e.target.files && addFiles(e.target.files)} />
              </div>

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
                  <p className="font-medium text-gray-800">Analysing {files.length} document{files.length !== 1 ? "s" : ""}…</p>
                  <p className="text-sm text-gray-500">Claude is reading the content and extracting case data</p>
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
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{doc.documentType}</span>
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

                      <Section title="Exhibits" icon={<FolderOpen className="w-4 h-4" />} color="bg-blue-50 text-blue-800" count={doc.exhibits.length}>
                        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
                          <span className="text-xs text-gray-500">{doc.exhibits.filter(e => e.checked).length} of {doc.exhibits.length} selected</span>
                          <div className="flex gap-2">
                            <button onClick={() => toggleAll(docIdx, "exhibits", true)} className="text-xs text-[#0F2547] hover:underline">All</button>
                            <button onClick={() => toggleAll(docIdx, "exhibits", false)} className="text-xs text-gray-400 hover:underline">None</button>
                          </div>
                        </div>
                        {doc.exhibits.map(ex => (
                          <ProposalRow key={ex._id} checked={ex.checked} onChange={v => { ex.checked = v; toggleItem(docIdx, "exhibits", ex._id); }}
                            label={ex.description}
                            meta={[ex.party, ex.date, ex.status].filter(Boolean).join(" · ")} />
                        ))}
                      </Section>

                      <Section title="Deadlines" icon={<Calendar className="w-4 h-4" />} color="bg-orange-50 text-orange-800" count={doc.deadlines.length}>
                        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
                          <span className="text-xs text-gray-500">{doc.deadlines.filter(d => d.checked).length} of {doc.deadlines.length} selected</span>
                          <div className="flex gap-2">
                            <button onClick={() => toggleAll(docIdx, "deadlines", true)} className="text-xs text-[#0F2547] hover:underline">All</button>
                            <button onClick={() => toggleAll(docIdx, "deadlines", false)} className="text-xs text-gray-400 hover:underline">None</button>
                          </div>
                        </div>
                        {doc.deadlines.map(dl => (
                          <ProposalRow key={dl._id} checked={dl.checked} onChange={v => { dl.checked = v; toggleItem(docIdx, "deadlines", dl._id); }}
                            label={dl.description}
                            meta={[dl.responsibleParty, dl.dueDate].filter(Boolean).join(" · ")} />
                        ))}
                      </Section>

                      <Section title="Procedural Orders" icon={<ClipboardList className="w-4 h-4" />} color="bg-purple-50 text-purple-800" count={doc.proceduralOrders.length}>
                        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
                          <span className="text-xs text-gray-500">{doc.proceduralOrders.filter(p => p.checked).length} of {doc.proceduralOrders.length} selected</span>
                          <div className="flex gap-2">
                            <button onClick={() => toggleAll(docIdx, "proceduralOrders", true)} className="text-xs text-[#0F2547] hover:underline">All</button>
                            <button onClick={() => toggleAll(docIdx, "proceduralOrders", false)} className="text-xs text-gray-400 hover:underline">None</button>
                          </div>
                        </div>
                        {doc.proceduralOrders.map(po => (
                          <ProposalRow key={po._id} checked={po.checked} onChange={v => { po.checked = v; toggleItem(docIdx, "proceduralOrders", po._id); }}
                            label={po.summary}
                            meta={[po.poNumber, po.dateIssued].filter(Boolean).join(" · ")} />
                        ))}
                      </Section>

                      {doc.exhibits.length === 0 && doc.deadlines.length === 0 && doc.proceduralOrders.length === 0 && (
                        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-600">
                          <Minus className="w-4 h-4 text-gray-400" />
                          No structured case data found in this document.
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── DONE ── */}
          {step === "done" && (
            <div className="p-8 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {appliedCount} item{appliedCount !== 1 ? "s" : ""} added to the case
                </h3>
                <p className="text-sm text-gray-500 mt-1">The case record has been updated. You can review each item in the relevant tabs.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-gray-50">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
            {step === "done" ? "Close" : "Cancel"}
          </button>

          {step === "upload" && (
            <button
              onClick={analyse}
              disabled={files.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#0F2547] text-white text-sm font-medium hover:bg-[#1e3a6e] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Analyse {files.length > 0 ? `${files.length} file${files.length !== 1 ? "s" : ""}` : "Documents"}
            </button>
          )}

          {step === "review" && totalChecked > 0 && (
            <button
              onClick={apply}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#0F2547] text-white text-sm font-medium hover:bg-[#1e3a6e] transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Add {totalChecked} item{totalChecked !== 1 ? "s" : ""} to case
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
