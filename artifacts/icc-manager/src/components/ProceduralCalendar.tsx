import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Calendar, List, CheckCircle2, Clock, AlertTriangle,
  ChevronDown, ChevronUp, FileText, Edit3
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListDeadlines,
  useAddDeadline,
  useUpdateDeadline,
  useDeleteDeadline,
  getListDeadlinesQueryKey,
  DeadlineStatus,
  DeadlineResponsibleParty,
} from "@workspace/api-client-react";
import type { Deadline } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn, formatDate } from "@/lib/utils";
import { differenceInDays, parseISO, addDays, format } from "date-fns";

// ─── Color logic ─────────────────────────────────────────────────────────────
function getDeadlineUrgency(dueDate: string, status: string) {
  if (status === "Completed") return "completed";
  const days = differenceInDays(parseISO(dueDate), new Date());
  if (days < 0) return "overdue";
  if (days <= 7) return "soon";
  if (days <= 14) return "upcoming";
  return "future";
}

const urgencyConfig = {
  overdue:   { bar: "bg-red-500",    badge: "bg-red-100 text-red-800 border-red-200",    dot: "bg-red-500",    label: "Overdue" },
  soon:      { bar: "bg-orange-500", badge: "bg-orange-100 text-orange-800 border-orange-200", dot: "bg-orange-500", label: "Due soon" },
  upcoming:  { bar: "bg-yellow-500", badge: "bg-yellow-100 text-yellow-800 border-yellow-200", dot: "bg-yellow-400", label: "Upcoming" },
  future:    { bar: "bg-green-500",  badge: "bg-green-100 text-green-800 border-green-200",  dot: "bg-green-500",  label: "Scheduled" },
  completed: { bar: "bg-slate-300",  badge: "bg-slate-100 text-slate-600 border-slate-200",  dot: "bg-slate-400",  label: "Completed" },
};

const partyColors: Record<string, string> = {
  Claimant:   "bg-blue-100 text-blue-800 border-blue-200",
  Respondent: "bg-purple-100 text-purple-800 border-purple-200",
  Tribunal:   "bg-amber-100 text-amber-800 border-amber-200",
  All:        "bg-slate-100 text-slate-700 border-slate-200",
};

// ─── ICC Standard Deadlines Generator ────────────────────────────────────────
function generateIccDeadlines(dateOfRequest: string, caseId: number) {
  const base = parseISO(dateOfRequest);
  return [
    { description: "Answer to Request for Arbitration", responsibleParty: "Respondent", dueDate: format(addDays(base, 30), "yyyy-MM-dd"),  status: "Pending", proceduralOrderRef: null, extensionOrderRef: null, originalDueDate: null, notes: "ICC Rules Art. 5 — 30 days from notification of Request", caseId },
    { description: "Case Management Conference", responsibleParty: "Tribunal", dueDate: format(addDays(base, 60), "yyyy-MM-dd"), status: "Pending", proceduralOrderRef: null, extensionOrderRef: null, originalDueDate: null, notes: "Preliminary conference to set procedural timetable", caseId },
    { description: "Terms of Reference", responsibleParty: "All", dueDate: format(addDays(base, 90), "yyyy-MM-dd"), status: "Pending", proceduralOrderRef: "PO1", extensionOrderRef: null, originalDueDate: null, notes: "ICC Rules Art. 23 — within 2 months of file transmission", caseId },
    { description: "Claimant's Memorial (Statement of Claim)", responsibleParty: "Claimant", dueDate: format(addDays(base, 150), "yyyy-MM-dd"), status: "Pending", proceduralOrderRef: "PO1", extensionOrderRef: null, originalDueDate: null, notes: "Per procedural timetable — adjust date as ordered", caseId },
    { description: "Respondent's Counter-Memorial", responsibleParty: "Respondent", dueDate: format(addDays(base, 240), "yyyy-MM-dd"), status: "Pending", proceduralOrderRef: "PO1", extensionOrderRef: null, originalDueDate: null, notes: "Per procedural timetable — adjust date as ordered", caseId },
    { description: "Claimant's Reply", responsibleParty: "Claimant", dueDate: format(addDays(base, 300), "yyyy-MM-dd"), status: "Pending", proceduralOrderRef: "PO1", extensionOrderRef: null, originalDueDate: null, notes: "Per procedural timetable — adjust date as ordered", caseId },
    { description: "Respondent's Rejoinder", responsibleParty: "Respondent", dueDate: format(addDays(base, 360), "yyyy-MM-dd"), status: "Pending", proceduralOrderRef: "PO1", extensionOrderRef: null, originalDueDate: null, notes: "Per procedural timetable — adjust date as ordered", caseId },
    { description: "Evidentiary Hearing", responsibleParty: "All", dueDate: format(addDays(base, 450), "yyyy-MM-dd"), status: "Pending", proceduralOrderRef: null, extensionOrderRef: null, originalDueDate: null, notes: "Approximate hearing window — confirm with tribunal", caseId },
  ] as const;
}

// ─── Add/Edit Deadline Modal ──────────────────────────────────────────────────
interface DeadlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  isPending: boolean;
  initial?: Deadline | null;
}

function DeadlineModal({ isOpen, onClose, onSave, isPending, initial }: DeadlineModalProps) {
  const [status, setStatus] = useState<string>(initial?.status ?? "Pending");
  const isEdit = !!initial;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newStatus = fd.get("status") as string;
    const payload: any = {
      description:       fd.get("description") as string,
      responsibleParty:  fd.get("responsibleParty") as string,
      dueDate:           fd.get("dueDate") as string,
      status:            newStatus,
      proceduralOrderRef: (fd.get("proceduralOrderRef") as string) || null,
      notes:             (fd.get("notes") as string) || null,
      extensionOrderRef: null,
      originalDueDate:   null,
    };
    if (newStatus === "Extended") {
      payload.extensionOrderRef = (fd.get("extensionOrderRef") as string) || null;
      payload.originalDueDate   = isEdit && initial?.status !== "Extended"
        ? initial?.dueDate ?? null
        : initial?.originalDueDate ?? null;
    }
    onSave(payload);
  };

  const input = "w-full rounded-md border border-border h-10 px-3 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors";
  const label = "text-sm font-semibold mb-1 block text-foreground";

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg bg-card border-border shadow-2xl p-0 gap-0">
        <DialogHeader className="p-6 border-b border-border bg-muted/30">
          <DialogTitle className="font-display text-xl text-foreground">
            {isEdit ? "Edit Deadline" : "Add Procedural Deadline"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={label}>Description *</label>
            <input name="description" required defaultValue={initial?.description} placeholder="e.g. Claimant's Memorial" className={input} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Responsible Party *</label>
              <select name="responsibleParty" required defaultValue={initial?.responsibleParty ?? "All"} className={input}>
                {Object.values(DeadlineResponsibleParty).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Status *</label>
              <select name="status" required defaultValue={initial?.status ?? "Pending"} onChange={e => setStatus(e.target.value)} className={input}>
                {Object.values(DeadlineStatus).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>{status === "Extended" ? "New Due Date *" : "Due Date *"}</label>
              <input type="date" name="dueDate" required defaultValue={initial?.dueDate} className={input} />
            </div>
            <div>
              <label className={label}>PO Reference</label>
              <input name="proceduralOrderRef" defaultValue={initial?.proceduralOrderRef ?? ""} placeholder="e.g. PO1" className={input} />
            </div>
          </div>

          {status === "Extended" && (
            <div>
              <label className={label}>Extension PO Reference *</label>
              <input name="extensionOrderRef" required defaultValue={initial?.extensionOrderRef ?? ""} placeholder="e.g. PO3" className={input} />
            </div>
          )}

          <div>
            <label className={label}>Notes</label>
            <textarea name="notes" rows={2} defaultValue={initial?.notes ?? ""} placeholder="Additional context or instructions..." className="w-full rounded-md border border-border p-3 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
            <button type="submit" disabled={isPending} className="bg-primary text-primary-foreground px-6 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 shadow-sm transition-colors">
              {isPending ? "Saving..." : isEdit ? "Save Changes" : "Add Deadline"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Timeline View ────────────────────────────────────────────────────────────
function TimelineView({ deadlines, onEdit, onDelete, onToggleComplete }: {
  deadlines: Deadline[];
  onEdit: (d: Deadline) => void;
  onDelete: (id: number) => void;
  onToggleComplete: (d: Deadline) => void;
}) {
  const sorted = [...deadlines].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
      <div className="space-y-4 pl-12">
        {sorted.map((d, i) => {
          const urg = getDeadlineUrgency(d.dueDate, d.status);
          const cfg = urgencyConfig[urg];
          return (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="relative"
            >
              <div className={cn("absolute -left-8 top-4 w-3 h-3 rounded-full border-2 border-card shadow-sm", cfg.dot)} />
              <div className={cn("rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow group",
                d.status === "Completed" && "opacity-60")}>
                <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-xl", cfg.bar)} />
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", cfg.badge)}>
                        {cfg.label}
                      </span>
                      <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", partyColors[d.responsibleParty])}>
                        {d.responsibleParty}
                      </span>
                      {d.proceduralOrderRef && (
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full border border-border font-medium">
                          {d.proceduralOrderRef}
                        </span>
                      )}
                    </div>
                    <p className={cn("font-semibold text-foreground", d.status === "Completed" && "line-through decoration-muted-foreground")}>
                      {d.description}
                    </p>
                    <div className="mt-1 text-sm text-muted-foreground flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {d.status === "Extended" && d.originalDueDate ? (
                          <>
                            <span className="line-through mr-1">{formatDate(d.originalDueDate)}</span>
                            <span className="text-orange-600 font-medium">{formatDate(d.dueDate)}</span>
                            {d.extensionOrderRef && <span className="ml-1 text-xs">({d.extensionOrderRef})</span>}
                          </>
                        ) : (
                          <span>{formatDate(d.dueDate)}</span>
                        )}
                      </span>
                    </div>
                    {d.notes && <p className="mt-1.5 text-xs text-muted-foreground italic">{d.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onToggleComplete(d)}
                      className={cn("p-1.5 rounded-md transition-colors text-muted-foreground",
                        d.status === "Completed" ? "hover:bg-muted" : "hover:bg-green-100 hover:text-green-700")}
                      title={d.status === "Completed" ? "Mark Pending" : "Mark Complete"}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => onEdit(d)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors" title="Edit">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(d.id)} className="p-1.5 rounded-md hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Table View ───────────────────────────────────────────────────────────────
type SortKey = "dueDate" | "description" | "responsibleParty" | "status";

function TableView({ deadlines, onEdit, onDelete, onToggleComplete }: {
  deadlines: Deadline[];
  onEdit: (d: Deadline) => void;
  onDelete: (id: number) => void;
  onToggleComplete: (d: Deadline) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("dueDate");
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = useMemo(() => {
    return [...deadlines].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [deadlines, sortKey, sortAsc]);

  const SortBtn = ({ col, label }: { col: SortKey; label: string }) => (
    <button
      onClick={() => { if (sortKey === col) setSortAsc(v => !v); else { setSortKey(col); setSortAsc(true); } }}
      className="flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {label}
      {sortKey === col ? (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ChevronDown className="w-3 h-3 opacity-30" />}
    </button>
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted text-muted-foreground uppercase tracking-wider text-xs font-bold">
          <tr>
            <th className="px-4 py-3"><SortBtn col="dueDate" label="Due Date" /></th>
            <th className="px-4 py-3"><SortBtn col="description" label="Description" /></th>
            <th className="px-4 py-3"><SortBtn col="responsibleParty" label="Party" /></th>
            <th className="px-4 py-3">PO Ref</th>
            <th className="px-4 py-3"><SortBtn col="status" label="Status" /></th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {sorted.map(d => {
            const urg = getDeadlineUrgency(d.dueDate, d.status);
            const cfg = urgencyConfig[urg];
            return (
              <tr key={d.id} className={cn("hover:bg-muted/30 transition-colors", d.status === "Completed" && "opacity-60")}>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full flex-shrink-0", cfg.dot)} />
                    {d.status === "Extended" && d.originalDueDate ? (
                      <div>
                        <span className="line-through text-muted-foreground text-xs block">{formatDate(d.originalDueDate)}</span>
                        <span className="text-orange-600 font-semibold">{formatDate(d.dueDate)}</span>
                      </div>
                    ) : (
                      <span className="font-medium">{formatDate(d.dueDate)}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className={cn("font-semibold text-foreground", d.status === "Completed" && "line-through")}>{d.description}</p>
                  {d.notes && <p className="text-xs text-muted-foreground italic mt-0.5 max-w-xs truncate">{d.notes}</p>}
                  {d.extensionOrderRef && <p className="text-xs text-orange-600 mt-0.5">Extended per {d.extensionOrderRef}</p>}
                </td>
                <td className="px-4 py-3">
                  <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold", partyColors[d.responsibleParty])}>
                    {d.responsibleParty}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{d.proceduralOrderRef ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold", cfg.badge)}>
                    {d.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onToggleComplete(d)}
                      className={cn("p-1.5 rounded-md transition-colors text-muted-foreground",
                        d.status === "Completed" ? "hover:bg-muted" : "hover:bg-green-100 hover:text-green-700")}
                      title={d.status === "Completed" ? "Mark Pending" : "Mark Complete"}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onEdit(d)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors" title="Edit">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onDelete(d.id)} className="p-1.5 rounded-md hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
interface ProceduralCalendarProps {
  caseId: number;
  dateOfRequest: string;
}

export default function ProceduralCalendar({ caseId, dateOfRequest }: ProceduralCalendarProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"timeline" | "table">("timeline");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editDeadline, setEditDeadline] = useState<Deadline | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListDeadlinesQueryKey(caseId) });

  const { data: deadlines = [], isLoading } = useListDeadlines(caseId);

  const addDeadline = useAddDeadline({
    mutation: {
      onSuccess: () => { invalidate(); setIsModalOpen(false); toast({ title: "Deadline added" }); },
      onError:   (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    }
  });

  const updateDeadline = useUpdateDeadline({
    mutation: {
      onSuccess: () => { invalidate(); setEditDeadline(null); toast({ title: "Deadline updated" }); },
      onError:   (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    }
  });

  const deleteDeadline = useDeleteDeadline({
    mutation: {
      onSuccess: () => { invalidate(); toast({ title: "Deadline removed" }); },
      onError:   (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    }
  });

  // Counters
  const stats = useMemo(() => {
    const pending   = deadlines.filter(d => d.status === "Pending" || d.status === "Extended");
    const overdue   = pending.filter(d => differenceInDays(parseISO(d.dueDate), new Date()) < 0);
    const completed = deadlines.filter(d => d.status === "Completed");
    return { pending: pending.length, overdue: overdue.length, completed: completed.length };
  }, [deadlines]);

  const handleToggleComplete = (d: Deadline) => {
    const newStatus = d.status === "Completed" ? "Pending" : "Completed";
    updateDeadline.mutate({
      caseId,
      deadlineId: d.id,
      data: { ...d, status: newStatus as any, originalDueDate: d.originalDueDate ?? null, proceduralOrderRef: d.proceduralOrderRef ?? null, extensionOrderRef: d.extensionOrderRef ?? null, notes: d.notes ?? null },
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Remove this deadline?")) {
      deleteDeadline.mutate({ caseId, deadlineId: id });
    }
  };

  const handleGenerateIccDeadlines = async () => {
    setIsGenerating(true);
    const templates = generateIccDeadlines(dateOfRequest, caseId);
    try {
      for (const t of templates) {
        await new Promise<void>((resolve, reject) => {
          addDeadline.mutate(
            { caseId, data: t as any },
            { onSuccess: () => resolve(), onError: (e) => reject(e) }
          );
        });
      }
      toast({ title: "ICC Standard Deadlines Added", description: `${templates.length} procedural milestones added. Adjust dates as ordered.` });
    } catch {
      toast({ title: "Some deadlines failed to add", variant: "destructive" });
    } finally {
      setIsGenerating(false);
      invalidate();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-display font-bold text-foreground">Procedural Calendar</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Manage all procedural deadlines and milestones.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleGenerateIccDeadlines}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 text-sm font-medium border border-border bg-card hover:bg-muted px-4 py-2 rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            {isGenerating ? "Generating..." : "Add ICC Standard Deadlines"}
          </button>
          <button
            onClick={() => { setEditDeadline(null); setIsModalOpen(true); }}
            className="inline-flex items-center gap-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Deadline
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
            <Clock className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
            <p className="text-xs text-muted-foreground font-medium">Pending</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="w-5 h-5 text-red-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-red-700">{stats.overdue}</p>
            <p className="text-xs text-red-600 font-medium">Overdue</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
            <p className="text-xs text-green-600 font-medium">Completed</p>
          </div>
        </div>
      </div>

      {/* Color legend */}
      <div className="flex flex-wrap gap-3 text-xs font-medium">
        {(["overdue","soon","upcoming","future","completed"] as const).map(u => (
          <span key={u} className="flex items-center gap-1.5">
            <span className={cn("w-2.5 h-2.5 rounded-full", urgencyConfig[u].dot)} />
            <span className="text-muted-foreground">{urgencyConfig[u].label}</span>
          </span>
        ))}
      </div>

      {/* View toggle + content */}
      <div className="space-y-4">
        <div className="flex items-center gap-1 border border-border rounded-lg p-1 w-fit bg-muted/30">
          <button
            onClick={() => setView("timeline")}
            className={cn("flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all",
              view === "timeline" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            <Calendar className="w-4 h-4" /> Timeline
          </button>
          <button
            onClick={() => setView("table")}
            className={cn("flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all",
              view === "table" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            <List className="w-4 h-4" /> Table
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : deadlines.length === 0 ? (
          <div className="p-16 text-center border border-dashed border-border rounded-xl bg-muted/20">
            <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-4 opacity-40" />
            <p className="text-muted-foreground font-medium">No deadlines scheduled.</p>
            <p className="text-sm text-muted-foreground mt-1">Add a custom deadline or generate ICC standard milestones.</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {view === "timeline" ? (
              <motion.div key="timeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <TimelineView
                  deadlines={deadlines}
                  onEdit={d => setEditDeadline(d)}
                  onDelete={handleDelete}
                  onToggleComplete={handleToggleComplete}
                />
              </motion.div>
            ) : (
              <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <TableView
                  deadlines={deadlines}
                  onEdit={d => setEditDeadline(d)}
                  onDelete={handleDelete}
                  onToggleComplete={handleToggleComplete}
                />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Add modal */}
      <DeadlineModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={(data) => addDeadline.mutate({ caseId, data })}
        isPending={addDeadline.isPending}
      />

      {/* Edit modal */}
      {editDeadline && (
        <DeadlineModal
          isOpen={!!editDeadline}
          onClose={() => setEditDeadline(null)}
          onSave={(data) => updateDeadline.mutate({ caseId, deadlineId: editDeadline.id, data })}
          isPending={updateDeadline.isPending}
          initial={editDeadline}
        />
      )}
    </div>
  );
}
