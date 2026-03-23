import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Edit3, FileText, CheckCircle2, Clock, ChevronDown, ChevronUp,
  CalendarClock, BookOpen, Gavel, AlertCircle, Eye, EyeOff
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListProceduralOrders,
  useAddProceduralOrder,
  useUpdateProceduralOrder,
  useDeleteProceduralOrder,
  useApplyPoToDeadlines,
  useListDeadlines,
  getListProceduralOrdersQueryKey,
  getListDeadlinesQueryKey,
} from "@workspace/api-client-react";
import type { ProceduralOrder, Deadline } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn, formatDate } from "@/lib/utils";

// ─── Draft PO Formatter ──────────────────────────────────────────────────────
function formatDraftToPO(raw: string, poNumber: string, dateIssued: string, caseRef: string): string {
  if (!raw.trim()) return "";
  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
  const numbered = lines.map((line, i) => `${i + 1}. ${line}`).join("\n\n");
  const dateStr = dateIssued ? formatDate(dateIssued) : "[DATE]";
  return `PROCEDURAL ORDER NO. ${poNumber.replace("PO", "")}

Case: ${caseRef || "[Case Reference]"}
Date: ${dateStr}

─────────────────────────────────────────

HAVING CONSIDERED the submissions of the parties and the procedural circumstances of this arbitration;

IT IS HEREBY ORDERED:

${numbered}

─────────────────────────────────────────

Done at the seat of arbitration on ${dateStr}.

[PRESIDENT OF THE TRIBUNAL]
[CO-ARBITRATOR]
[CO-ARBITRATOR]`;
}

// ─── Deadline Selector for PO Application ────────────────────────────────────
interface DeadlineUpdate {
  deadlineId: number;
  newDueDate: string;
  description: string;
}

function DeadlineLinkModal({
  isOpen,
  onClose,
  onApply,
  deadlines,
  poNumber,
  isPending,
}: {
  isOpen: boolean;
  onClose: () => void;
  onApply: (updates: DeadlineUpdate[]) => void;
  deadlines: Deadline[];
  poNumber: string;
  isPending: boolean;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [newDates, setNewDates] = useState<Record<number, string>>({});

  const toggle = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApply = () => {
    const updates: DeadlineUpdate[] = Array.from(selected).map(id => ({
      deadlineId: id,
      newDueDate: newDates[id] ?? deadlines.find(d => d.id === id)?.dueDate ?? "",
      description: deadlines.find(d => d.id === d.id)?.description ?? "",
    })).filter(u => u.newDueDate);
    onApply(updates);
  };

  const pending = deadlines.filter(d => d.status !== "Completed");
  const input = "rounded-md border border-border h-9 px-3 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors w-40";

  return (
    <Dialog open={isOpen} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl bg-card border-border shadow-2xl p-0 gap-0">
        <DialogHeader className="p-6 border-b border-border bg-muted/30">
          <DialogTitle className="font-display text-xl text-foreground">
            Apply {poNumber} to Existing Deadlines
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Select the deadlines modified by this order and provide their new due dates.
            They will be marked as <strong>Extended per {poNumber}</strong>.
          </p>
        </DialogHeader>
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {pending.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No pending deadlines to update.</p>
          ) : (
            <div className="space-y-2">
              {pending.map(d => (
                <div
                  key={d.id}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer",
                    selected.has(d.id)
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:bg-muted/30"
                  )}
                  onClick={() => toggle(d.id)}
                >
                  <div className={cn(
                    "w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors",
                    selected.has(d.id) ? "bg-primary border-primary" : "border-muted-foreground"
                  )}>
                    {selected.has(d.id) && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{d.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Current: {formatDate(d.dueDate)} · {d.responsibleParty}
                      {d.proceduralOrderRef && ` · ${d.proceduralOrderRef}`}
                    </p>
                  </div>
                  {selected.has(d.id) && (
                    <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <label className="text-xs text-muted-foreground block mb-1 font-medium">New date</label>
                      <input
                        type="date"
                        defaultValue={d.dueDate}
                        className={input}
                        onChange={e => setNewDates(prev => ({ ...prev, [d.id]: e.target.value }))}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-between items-center p-6 border-t border-border">
          <p className="text-sm text-muted-foreground">
            {selected.size} deadline{selected.size !== 1 ? "s" : ""} selected
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Skip
            </button>
            <button
              onClick={handleApply}
              disabled={selected.size === 0 || isPending}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 shadow-sm transition-colors"
            >
              {isPending ? "Applying..." : `Apply to ${selected.size} Deadline${selected.size !== 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add/Edit PO Modal ────────────────────────────────────────────────────────
interface POModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  isPending: boolean;
  initial?: ProceduralOrder | null;
  nextPoNumber: string;
  caseRef: string;
}

function POModal({ isOpen, onClose, onSave, isPending, initial, nextPoNumber, caseRef }: POModalProps) {
  const poNumber = initial?.poNumber ?? nextPoNumber;
  const isEdit = !!initial;

  const [draftContent, setDraftContent] = useState(initial?.draftContent ?? "");
  const [dateIssued, setDateIssued] = useState(initial?.dateIssued ?? "");
  const [showPreview, setShowPreview] = useState(false);
  const [isDraft, setIsDraft] = useState(!initial?.isFinalized);

  const preview = useMemo(
    () => formatDraftToPO(draftContent, poNumber, dateIssued, caseRef),
    [draftContent, poNumber, dateIssued, caseRef]
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onSave({
      dateIssued: fd.get("dateIssued") as string,
      summary: fd.get("summary") as string,
      draftContent: draftContent || null,
      formattedContent: draftContent ? preview : null,
      isFinalized: !isDraft,
    });
  };

  const inputCls = "w-full rounded-md border border-border h-10 px-3 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors";
  const label = "text-sm font-semibold mb-1 block text-foreground";

  return (
    <Dialog open={isOpen} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-3xl bg-card border-border shadow-2xl p-0 gap-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="p-6 border-b border-border bg-muted/30 flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="font-display text-xl text-foreground">
              {isEdit ? `Edit ${initial.poNumber}` : `New ${nextPoNumber}`}
            </DialogTitle>
            <span className={cn(
              "text-xs font-semibold px-3 py-1 rounded-full border",
              isDraft ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-green-50 text-green-700 border-green-200"
            )}>
              {isDraft ? "Draft" : "Finalized"}
            </span>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-y-auto">
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={label}>Date Issued *</label>
                <input
                  type="date"
                  name="dateIssued"
                  required
                  defaultValue={initial?.dateIssued ?? ""}
                  onChange={e => setDateIssued(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    onClick={() => setIsDraft(v => !v)}
                    className={cn(
                      "relative w-10 h-5 rounded-full transition-colors",
                      !isDraft ? "bg-primary" : "bg-muted-foreground/30"
                    )}
                  >
                    <span className={cn(
                      "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                      !isDraft && "translate-x-5"
                    )} />
                  </div>
                  <span className="text-sm font-medium text-foreground">Mark as Finalized</span>
                </label>
              </div>
            </div>

            <div>
              <label className={label}>Summary of Key Directions *</label>
              <textarea
                name="summary"
                required
                rows={3}
                defaultValue={initial?.summary ?? ""}
                placeholder="Brief summary of the key directions in this procedural order..."
                className="w-full rounded-md border border-border p-3 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors resize-none"
              />
            </div>

            {/* Draft PO section */}
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">Draft Text</span>
                  <span className="text-xs text-muted-foreground ml-1">— Paste tribunal directions to auto-format</span>
                </div>
                {draftContent.trim() && (
                  <button
                    type="button"
                    onClick={() => setShowPreview(v => !v)}
                    className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showPreview ? "Hide Preview" : "Preview Formatted"}
                  </button>
                )}
              </div>

              <AnimatePresence>
                {showPreview && draftContent.trim() ? (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-b border-border"
                  >
                    <div className="p-4 bg-slate-50 font-mono text-xs whitespace-pre-wrap text-slate-700 max-h-72 overflow-y-auto leading-relaxed">
                      {preview}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <textarea
                value={draftContent}
                onChange={e => setDraftContent(e.target.value)}
                rows={6}
                placeholder={"Paste directions here, one per line. For example:\nThe Claimant shall submit its Memorial by 1 August 2026.\nThe Respondent shall file its Counter-Memorial within 90 days of receipt.\nA case management conference is scheduled for 15 September 2026."}
                className="w-full p-4 bg-background text-sm focus:outline-none resize-none border-0 focus:ring-0"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 p-6 border-t border-border bg-muted/10 flex-shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isPending} className="bg-primary text-primary-foreground px-6 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 shadow-sm transition-colors">
              {isPending ? "Saving..." : isEdit ? "Save Changes" : `Issue ${nextPoNumber}`}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── PO Card ──────────────────────────────────────────────────────────────────
function POCard({
  po,
  onEdit,
  onDelete,
  onApplyToDeadlines,
}: {
  po: ProceduralOrder;
  onEdit: () => void;
  onDelete: () => void;
  onApplyToDeadlines: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow group"
    >
      {/* PO number stripe */}
      <div className={cn(
        "h-1 rounded-t-xl",
        po.isFinalized ? "bg-primary" : "bg-amber-400"
      )} />

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl font-display font-bold text-sm shadow-sm",
              po.isFinalized
                ? "bg-primary/10 text-primary"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            )}>
              {po.poNumber}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-foreground text-base">Procedural Order {po.poNumber.replace("PO", "")}</span>
                <span className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded-full border",
                  po.isFinalized
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                )}>
                  {po.isFinalized ? "Finalized" : "Draft"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
                <CalendarClock className="w-3.5 h-3.5" />
                Issued: {formatDate(po.dateIssued)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button
              onClick={onApplyToDeadlines}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Apply to deadlines"
            >
              <CalendarClock className="w-3.5 h-3.5" /> Update Deadlines
            </button>
            <button onClick={onEdit} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors" title="Edit">
              <Edit3 className="w-4 h-4" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-md hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors" title="Delete">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-sm font-semibold text-foreground mb-1 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-muted-foreground" /> Key Directions
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">{po.summary}</p>
        </div>

        {po.formattedContent && (
          <div className="mt-4">
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              {expanded ? "Hide Formatted PO" : "View Formatted PO"}
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 overflow-hidden"
                >
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 font-mono text-xs whitespace-pre-wrap text-slate-700 max-h-80 overflow-y-auto leading-relaxed">
                    {po.formattedContent}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
interface ProceduralOrdersProps {
  caseId: number;
  caseRef: string;
}

export default function ProceduralOrders({ caseId, caseRef }: ProceduralOrdersProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editPO, setEditPO] = useState<ProceduralOrder | null>(null);
  const [linkModal, setLinkModal] = useState<{ poId: number; poNumber: string } | null>(null);

  const invalidatePOs = () => queryClient.invalidateQueries({ queryKey: getListProceduralOrdersQueryKey(caseId) });
  const invalidateDeadlines = () => queryClient.invalidateQueries({ queryKey: getListDeadlinesQueryKey(caseId) });

  const { data: orders = [], isLoading } = useListProceduralOrders(caseId);
  const { data: deadlines = [] } = useListDeadlines(caseId);

  const addPO = useAddProceduralOrder({
    mutation: {
      onSuccess: (newPO) => {
        invalidatePOs();
        setIsModalOpen(false);
        // Prompt to apply to deadlines
        setLinkModal({ poId: newPO.id, poNumber: newPO.poNumber });
        toast({ title: `${newPO.poNumber} issued` });
      },
      onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    }
  });

  const updatePO = useUpdateProceduralOrder({
    mutation: {
      onSuccess: () => { invalidatePOs(); setEditPO(null); toast({ title: "Procedural order updated" }); },
      onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    }
  });

  const deletePO = useDeleteProceduralOrder({
    mutation: {
      onSuccess: () => { invalidatePOs(); toast({ title: "Procedural order deleted" }); },
      onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    }
  });

  const applyToDeadlines = useApplyPoToDeadlines({
    mutation: {
      onSuccess: (updated) => {
        invalidateDeadlines();
        setLinkModal(null);
        toast({ title: `Calendar updated`, description: `${updated.length} deadline${updated.length !== 1 ? "s" : ""} extended.` });
      },
      onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    }
  });

  const sorted = useMemo(() =>
    [...orders].sort((a, b) => a.dateIssued.localeCompare(b.dateIssued)),
    [orders]
  );

  const stats = useMemo(() => ({
    total: orders.length,
    lastDate: sorted[sorted.length - 1]?.dateIssued ?? null,
    draftCount: orders.filter(o => !o.isFinalized).length,
  }), [orders, sorted]);

  const nextPoNumber = `PO${orders.length + 1}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-display font-bold text-foreground">Procedural Orders</h3>
          <p className="text-sm text-muted-foreground mt-0.5">All procedural orders issued in this arbitration, chronologically.</p>
        </div>
        <button
          onClick={() => { setEditPO(null); setIsModalOpen(true); }}
          className="inline-flex items-center gap-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" /> Issue {nextPoNumber}
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Gavel className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground font-medium">Total Orders</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
            <CalendarClock className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">
              {stats.lastDate ? formatDate(stats.lastDate) : "—"}
            </p>
            <p className="text-xs text-muted-foreground font-medium">Last Issued</p>
          </div>
        </div>
        <div className={cn(
          "flex items-center gap-3 rounded-xl border p-4 shadow-sm",
          stats.draftCount > 0 ? "border-amber-200 bg-amber-50" : "border-border bg-card"
        )}>
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            stats.draftCount > 0 ? "bg-amber-100" : "bg-slate-100"
          )}>
            <AlertCircle className={cn("w-5 h-5", stats.draftCount > 0 ? "text-amber-700" : "text-slate-400")} />
          </div>
          <div>
            <p className={cn("text-2xl font-bold", stats.draftCount > 0 ? "text-amber-700" : "text-foreground")}>
              {stats.draftCount}
            </p>
            <p className={cn("text-xs font-medium", stats.draftCount > 0 ? "text-amber-600" : "text-muted-foreground")}>
              Not Yet Finalized
            </p>
          </div>
        </div>
      </div>

      {/* PO List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="p-16 text-center border border-dashed border-border rounded-xl bg-muted/20">
          <Gavel className="w-10 h-10 text-muted-foreground mx-auto mb-4 opacity-40" />
          <p className="text-muted-foreground font-medium">No procedural orders issued yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Issue the first procedural order to track the tribunal's directions.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map((po, i) => (
            <POCard
              key={po.id}
              po={po}
              onEdit={() => setEditPO(po)}
              onDelete={() => {
                if (confirm(`Delete ${po.poNumber}? This cannot be undone.`)) {
                  deletePO.mutate({ caseId, poId: po.id });
                }
              }}
              onApplyToDeadlines={() => setLinkModal({ poId: po.id, poNumber: po.poNumber })}
            />
          ))}
        </div>
      )}

      {/* Add PO Modal */}
      {isModalOpen && (
        <POModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={(data) => addPO.mutate({ caseId, data })}
          isPending={addPO.isPending}
          nextPoNumber={nextPoNumber}
          caseRef={caseRef}
        />
      )}

      {/* Edit PO Modal */}
      {editPO && (
        <POModal
          isOpen={!!editPO}
          onClose={() => setEditPO(null)}
          onSave={(data) => updatePO.mutate({ caseId, poId: editPO.id, data })}
          isPending={updatePO.isPending}
          initial={editPO}
          nextPoNumber={editPO.poNumber}
          caseRef={caseRef}
        />
      )}

      {/* Deadline link modal */}
      {linkModal && (
        <DeadlineLinkModal
          isOpen={!!linkModal}
          onClose={() => setLinkModal(null)}
          poNumber={linkModal.poNumber}
          deadlines={deadlines}
          isPending={applyToDeadlines.isPending}
          onApply={(updates) =>
            applyToDeadlines.mutate({
              caseId,
              poId: linkModal.poId,
              data: { updates: updates.map(u => ({ deadlineId: u.deadlineId, newDueDate: u.newDueDate })) },
            })
          }
        />
      )}
    </div>
  );
}
