import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, eachDayOfInterval, parseISO, differenceInDays } from "date-fns";
import {
  useListHearings,
  useAddHearing,
  useUpdateHearing,
  useDeleteHearing,
  useListParticipants,
  useAddParticipant,
  useUpdateParticipant,
  useDeleteParticipant,
  useListWitnessSchedule,
  useAddWitnessScheduleEntry,
  useUpdateWitnessScheduleEntry,
  useDeleteWitnessScheduleEntry,
  useListChecklistItems,
  useAddChecklistItem,
  useUpdateChecklistItem,
  useDeleteChecklistItem,
  getListHearingsQueryKey,
  getListParticipantsQueryKey,
  getListWitnessScheduleQueryKey,
  getListChecklistItemsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const HEARING_TYPES = ["Merits", "Jurisdiction", "Quantum", "Procedural"] as const;
const PLATFORMS = ["Zoom", "Teams", "Arbitration Place", "Other"] as const;
const ATTENDANCE_MODES = ["In Person", "Remote"] as const;
const WITNESS_ROLES = ["Witness", "Expert"] as const;

const COMMON_TIMEZONES = [
  "UTC",
  "Europe/Paris",
  "Europe/London",
  "Europe/Zurich",
  "Europe/Stockholm",
  "Europe/Vienna",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Amsterdam",
  "Europe/Brussels",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "America/Toronto",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Asia/Seoul",
  "Asia/Riyadh",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Pacific/Auckland",
];

const PARTICIPANT_ROLES = [
  "Arbitrator (President)",
  "Arbitrator",
  "Co-Arbitrator",
  "Lead Counsel — Claimant",
  "Lead Counsel — Respondent",
  "Counsel — Claimant",
  "Counsel — Respondent",
  "Paralegal — Claimant",
  "Paralegal — Respondent",
  "Witness — Claimant",
  "Witness — Respondent",
  "Expert — Claimant",
  "Expert — Respondent",
  "Interpreter",
  "Court Reporter",
  "ICC Representative",
  "Observer",
  "Other",
];

function convertTimeToTZ(
  dateStr: string,
  timeStr: string,
  fromTZ: string,
  toTZ: string
): { display: string; hour: number } {
  try {
    const dtStr = `${dateStr}T${timeStr}:00Z`;
    const utcGuess = new Date(dtStr);
    const inFromTZ = new Intl.DateTimeFormat("en-US", {
      timeZone: fromTZ,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(utcGuess);
    const [th, tm] = timeStr.split(":").map(Number);
    const parts = inFromTZ.replace(/\u202F/g, " ").split(":");
    const fh = parseInt(parts[0], 10);
    const fm = parseInt(parts[1], 10);
    const targetMins = th * 60 + tm;
    const fromMins = fh * 60 + fm;
    let offsetMins = targetMins - fromMins;
    if (offsetMins > 12 * 60) offsetMins -= 24 * 60;
    if (offsetMins < -12 * 60) offsetMins += 24 * 60;
    const actualUTC = new Date(utcGuess.getTime() - offsetMins * 60 * 1000);
    const result = new Intl.DateTimeFormat("en-US", {
      timeZone: toTZ,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(actualUTC);
    const rh = parseInt(result.replace(/\u202F/g, " ").split(":")[0], 10);
    return { display: result, hour: rh };
  } catch {
    return { display: "--:--", hour: 9 };
  }
}

function hearingTypeColor(type: string) {
  const map: Record<string, string> = {
    Merits: "bg-navy-700 text-white",
    Jurisdiction: "bg-amber-700 text-white",
    Quantum: "bg-emerald-700 text-white",
    Procedural: "bg-slate-600 text-white",
  };
  return map[type] ?? "bg-slate-500 text-white";
}

function fmtMin(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

const NAVY = "#0F2547";

interface Props {
  caseId: number;
}

export default function HearingLogistics({ caseId }: Props) {
  const { data: hearings = [], isLoading } = useListHearings(caseId);
  const addHearing = useAddHearing();
  const deleteHearing = useDeleteHearing();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [selectedHearingId, setSelectedHearingId] = useState<number | null>(null);
  const [hearingModalOpen, setHearingModalOpen] = useState(false);
  const [editingHearing, setEditingHearing] = useState<any>(null);

  const selectedHearing = hearings.find((h) => h.id === selectedHearingId) ?? hearings[0] ?? null;

  const hearingDays = useMemo(() => {
    if (!selectedHearing) return [];
    try {
      return eachDayOfInterval({
        start: parseISO(selectedHearing.startDate),
        end: parseISO(selectedHearing.endDate),
      }).map((d) => format(d, "yyyy-MM-dd"));
    } catch {
      return [];
    }
  }, [selectedHearing]);

  function openAddHearing() {
    setEditingHearing(null);
    setHearingModalOpen(true);
  }
  function openEditHearing() {
    setEditingHearing(selectedHearing);
    setHearingModalOpen(true);
  }
  async function handleDeleteHearing() {
    if (!selectedHearing) return;
    if (!confirm(`Delete ${selectedHearing.hearingType} Hearing? This cannot be undone.`)) return;
    await deleteHearing.mutateAsync(
      { caseId, hearingId: selectedHearing.id },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListHearingsQueryKey(caseId) });
          setSelectedHearingId(null);
          toast({ title: "Hearing deleted" });
        },
      }
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400">
        Loading hearing data…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hearing Selector Bar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {hearings.map((h) => (
            <button
              key={h.id}
              onClick={() => setSelectedHearingId(h.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                (selectedHearing?.id ?? hearings[0]?.id) === h.id
                  ? "bg-[#0F2547] text-white border-transparent"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
              }`}
            >
              <span className="font-semibold">{h.hearingType}</span>
              <span className="ml-2 opacity-70 text-xs">
                {format(parseISO(h.startDate), "d MMM yyyy")}
              </span>
            </button>
          ))}
          <button
            onClick={openAddHearing}
            className="px-4 py-2 rounded-full text-sm font-medium border border-dashed border-slate-300 text-slate-500 hover:border-[#0F2547] hover:text-[#0F2547] transition-all"
          >
            + Schedule Hearing
          </button>
        </div>
      </div>

      {/* Empty State */}
      {hearings.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-200 rounded-xl"
        >
          <div className="text-6xl mb-4">🏛️</div>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">No hearings scheduled</h3>
          <p className="text-slate-400 text-sm mb-4">
            Schedule the first hearing to begin logistics planning.
          </p>
          <Button onClick={openAddHearing} className="bg-[#0F2547] hover:bg-[#1a3a6b] text-white">
            Schedule First Hearing
          </Button>
        </motion.div>
      )}

      {/* Main Content — shown when a hearing is selected */}
      {selectedHearing && (
        <div className="space-y-8">
          {/* Hearing Details Card */}
          <HearingDetailsCard
            hearing={selectedHearing}
            onEdit={openEditHearing}
            onDelete={handleDeleteHearing}
          />
          {/* Participant Schedule + Timezone Grid */}
          <ParticipantSection hearing={selectedHearing} hearingDays={hearingDays} />
          {/* Witness/Expert Schedule */}
          <WitnessSection hearing={selectedHearing} hearingDays={hearingDays} />
          {/* Preparation Checklist */}
          <ChecklistSection hearingId={selectedHearing.id} />
        </div>
      )}

      {/* Hearing Modal */}
      <HearingModal
        open={hearingModalOpen}
        onClose={() => setHearingModalOpen(false)}
        caseId={caseId}
        existing={editingHearing}
        onSaved={(hearing) => {
          qc.invalidateQueries({ queryKey: getListHearingsQueryKey(caseId) });
          setSelectedHearingId(hearing.id);
          setHearingModalOpen(false);
        }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   HEARING DETAILS CARD
───────────────────────────────────────────── */
function HearingDetailsCard({ hearing, onEdit, onDelete }: { hearing: any; onEdit: () => void; onDelete: () => void }) {
  const days = useMemo(() => {
    try {
      return differenceInDays(parseISO(hearing.endDate), parseISO(hearing.startDate)) + 1;
    } catch {
      return 1;
    }
  }, [hearing]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 flex items-center justify-between" style={{ backgroundColor: NAVY }}>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${hearingTypeColor(hearing.hearingType)}`}>
            {hearing.hearingType}
          </span>
          <span className="text-white font-semibold text-lg">
            {hearing.isVirtual ? "Virtual Hearing" : "In-Person Hearing"}
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={onEdit} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-all">
            Edit Details
          </button>
          <button onClick={onDelete} className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/40 text-white text-sm rounded-lg transition-all">
            Delete
          </button>
        </div>
      </div>
      <div className="px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-6">
        <Detail label="Dates" value={`${format(parseISO(hearing.startDate), "d MMM")} – ${format(parseISO(hearing.endDate), "d MMM yyyy")}`} sub={`${days} hearing day${days !== 1 ? "s" : ""}`} />
        <Detail label="Location" value={hearing.location} sub={hearing.isVirtual && hearing.platform ? `Platform: ${hearing.platform}` : undefined} />
        <Detail label="Daily Sessions" value={`${hearing.startTime} – ${hearing.endTime}`} />
        <Detail label="Timezone of Record" value={hearing.timezoneOfRecord} />
      </div>
    </div>
  );
}

function Detail({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-slate-800 font-medium">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

/* ─────────────────────────────────────────────
   HEARING MODAL (Add / Edit)
───────────────────────────────────────────── */
function HearingModal({ open, onClose, caseId, existing, onSaved }: any) {
  const addHearing = useAddHearing();
  const updateHearing = useUpdateHearing();
  const { toast } = useToast();

  const [form, setForm] = useState({
    hearingType: "Merits",
    startDate: "",
    endDate: "",
    location: "",
    isVirtual: false,
    platform: "",
    startTime: "09:00",
    endTime: "17:00",
    timezoneOfRecord: "Europe/Paris",
  });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const [loading, setLoading] = useState(false);

  // Populate on open
  useState(() => {
    if (existing) {
      setForm({
        hearingType: existing.hearingType ?? "Merits",
        startDate: existing.startDate ?? "",
        endDate: existing.endDate ?? "",
        location: existing.location ?? "",
        isVirtual: existing.isVirtual ?? false,
        platform: existing.platform ?? "",
        startTime: existing.startTime ?? "09:00",
        endTime: existing.endTime ?? "17:00",
        timezoneOfRecord: existing.timezoneOfRecord ?? "Europe/Paris",
      });
    } else {
      setForm({
        hearingType: "Merits",
        startDate: "",
        endDate: "",
        location: "",
        isVirtual: false,
        platform: "",
        startTime: "09:00",
        endTime: "17:00",
        timezoneOfRecord: "Europe/Paris",
      });
    }
  });

  // Reset form when dialog opens
  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      if (existing) {
        setForm({
          hearingType: existing.hearingType ?? "Merits",
          startDate: existing.startDate ?? "",
          endDate: existing.endDate ?? "",
          location: existing.location ?? "",
          isVirtual: existing.isVirtual ?? false,
          platform: existing.platform ?? "",
          startTime: existing.startTime ?? "09:00",
          endTime: existing.endTime ?? "17:00",
          timezoneOfRecord: existing.timezoneOfRecord ?? "Europe/Paris",
        });
      } else {
        setForm({
          hearingType: "Merits",
          startDate: "",
          endDate: "",
          location: "",
          isVirtual: false,
          platform: "",
          startTime: "09:00",
          endTime: "17:00",
          timezoneOfRecord: "Europe/Paris",
        });
      }
    } else {
      onClose();
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        platform: form.isVirtual ? form.platform || null : null,
      };
      let result: any;
      if (existing) {
        result = await updateHearing.mutateAsync({ caseId, hearingId: existing.id, data: payload });
      } else {
        result = await addHearing.mutateAsync({ caseId, data: payload });
      }
      toast({ title: existing ? "Hearing updated" : "Hearing scheduled" });
      onSaved(result);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#0F2547]">
            {existing ? `Edit ${existing.hearingType} Hearing` : "Schedule New Hearing"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Hearing Type</Label>
              <select
                className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={form.hearingType}
                onChange={(e) => set("hearingType", e.target.value)}
              >
                {HEARING_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <Label>Timezone of Record</Label>
              <select
                className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={form.timezoneOfRecord}
                onChange={(e) => set("timezoneOfRecord", e.target.value)}
              >
                {COMMON_TIMEZONES.map((tz) => <option key={tz}>{tz}</option>)}
              </select>
            </div>
            <div>
              <Label>Start Date</Label>
              <Input type="date" className="mt-1" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} required />
            </div>
            <div>
              <Label>End Date</Label>
              <Input type="date" className="mt-1" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} required />
            </div>
            <div>
              <Label>Daily Start Time</Label>
              <Input type="time" className="mt-1" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} required />
            </div>
            <div>
              <Label>Daily End Time</Label>
              <Input type="time" className="mt-1" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} required />
            </div>
          </div>
          <div>
            <Label>Location (physical address or "Virtual")</Label>
            <Input className="mt-1" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. ICC Hearing Centre, Paris / Virtual" required />
          </div>
          <div className="flex items-center gap-3">
            <input
              id="isVirtual"
              type="checkbox"
              checked={form.isVirtual}
              onChange={(e) => set("isVirtual", e.target.checked)}
              className="w-4 h-4 accent-[#0F2547]"
            />
            <Label htmlFor="isVirtual" className="cursor-pointer">Virtual Hearing</Label>
          </div>
          {form.isVirtual && (
            <div>
              <Label>Platform</Label>
              <select
                className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={form.platform}
                onChange={(e) => set("platform", e.target.value)}
              >
                <option value="">Select platform…</option>
                {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-[#0F2547] hover:bg-[#1a3a6b] text-white">
              {loading ? "Saving…" : existing ? "Save Changes" : "Schedule Hearing"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────
   PARTICIPANT SECTION + TIMEZONE GRID
───────────────────────────────────────────── */
function ParticipantSection({ hearing, hearingDays }: { hearing: any; hearingDays: string[] }) {
  const { data: participants = [] } = useListParticipants(hearing.id);
  const addP = useAddParticipant();
  const updateP = useUpdateParticipant();
  const deleteP = useDeleteParticipant();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingP, setEditingP] = useState<any>(null);
  const [pForm, setPForm] = useState({
    name: "",
    role: "",
    timezone: "Europe/Paris",
    attendance: "In Person",
    attendingDays: [] as string[],
  });

  function openAdd() {
    setEditingP(null);
    setPForm({ name: "", role: "", timezone: "Europe/Paris", attendance: "In Person", attendingDays: hearingDays });
    setModalOpen(true);
  }
  function openEdit(p: any) {
    setEditingP(p);
    let days: string[] = [];
    try { days = JSON.parse(p.attendingDays); } catch { days = hearingDays; }
    setPForm({ name: p.name, role: p.role, timezone: p.timezone, attendance: p.attendance, attendingDays: days });
    setModalOpen(true);
  }
  async function handleDeleteP(p: any) {
    if (!confirm(`Remove ${p.name}?`)) return;
    await deleteP.mutateAsync({ hearingId: hearing.id, participantId: p.id }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListParticipantsQueryKey(hearing.id) });
        toast({ title: "Participant removed" });
      },
    });
  }
  async function handleSaveP(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...pForm,
      attendingDays: JSON.stringify(pForm.attendingDays),
    };
    if (editingP) {
      await updateP.mutateAsync({ hearingId: hearing.id, participantId: editingP.id, data: payload }, {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListParticipantsQueryKey(hearing.id) });
          toast({ title: "Participant updated" });
          setModalOpen(false);
        },
      });
    } else {
      await addP.mutateAsync({ hearingId: hearing.id, data: payload }, {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListParticipantsQueryKey(hearing.id) });
          toast({ title: "Participant added" });
          setModalOpen(false);
        },
      });
    }
  }

  function toggleDay(day: string) {
    setPForm((f) => ({
      ...f,
      attendingDays: f.attendingDays.includes(day)
        ? f.attendingDays.filter((d) => d !== day)
        : [...f.attendingDays, day],
    }));
  }

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-[#0F2547] flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-[#0F2547] inline-block" />
          Participant Schedule
          <span className="text-slate-400 font-normal text-sm">({participants.length})</span>
        </h3>
        <Button size="sm" onClick={openAdd} className="bg-[#0F2547] hover:bg-[#1a3a6b] text-white text-xs h-8">
          + Add Participant
        </Button>
      </div>

      {participants.length === 0 ? (
        <p className="text-slate-400 text-sm py-4 text-center border border-dashed border-slate-200 rounded-lg">
          No participants added yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Time Zone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Attendance</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Days Attending</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {participants.map((p: any, i: number) => {
                let days: string[] = [];
                try { days = JSON.parse(p.attendingDays); } catch {}
                return (
                  <tr key={p.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                    <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                    <td className="px-4 py-3 text-slate-600">{p.role}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{p.timezone}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.attendance === "Remote" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                        {p.attendance}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {days.length === hearingDays.length
                        ? "All days"
                        : days.map((d) => format(parseISO(d), "d MMM")).join(", ")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded text-slate-400 hover:text-[#0F2547] hover:bg-slate-100">✏️</button>
                        <button onClick={() => handleDeleteP(p)} className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50">🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Timezone Grid */}
      {participants.length > 0 && (
        <TimeZoneGrid hearing={hearing} participants={participants} />
      )}

      {/* Participant Modal */}
      <Dialog open={modalOpen} onOpenChange={(o) => !o && setModalOpen(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#0F2547]">{editingP ? "Edit Participant" : "Add Participant"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveP} className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input className="mt-1" value={pForm.name} onChange={(e) => setPForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <Label>Role</Label>
              <select
                className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={pForm.role}
                onChange={(e) => setPForm((f) => ({ ...f, role: e.target.value }))}
                required
              >
                <option value="">Select role…</option>
                {PARTICIPANT_ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Time Zone</Label>
                <select
                  className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  value={pForm.timezone}
                  onChange={(e) => setPForm((f) => ({ ...f, timezone: e.target.value }))}
                >
                  {COMMON_TIMEZONES.map((tz) => <option key={tz}>{tz}</option>)}
                </select>
              </div>
              <div>
                <Label>Attendance</Label>
                <select
                  className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  value={pForm.attendance}
                  onChange={(e) => setPForm((f) => ({ ...f, attendance: e.target.value }))}
                >
                  {ATTENDANCE_MODES.map((a) => <option key={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Days Attending</Label>
              <div className="flex flex-wrap gap-2">
                {hearingDays.map((day) => (
                  <label key={day} className="flex items-center gap-1.5 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={pForm.attendingDays.includes(day)}
                      onChange={() => toggleDay(day)}
                      className="w-3.5 h-3.5 accent-[#0F2547]"
                    />
                    <span>{format(parseISO(day), "EEE d MMM")}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#0F2547] hover:bg-[#1a3a6b] text-white">
                {editingP ? "Save Changes" : "Add Participant"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─────────────────────────────────────────────
   TIMEZONE GRID
───────────────────────────────────────────── */
function TimeZoneGrid({ hearing, participants }: { hearing: any; participants: any[] }) {
  const rows = useMemo(() => {
    return participants.map((p) => {
      const start = convertTimeToTZ(hearing.startDate, hearing.startTime, hearing.timezoneOfRecord, p.timezone);
      const end = convertTimeToTZ(hearing.startDate, hearing.endTime, hearing.timezoneOfRecord, p.timezone);
      const unsociable = start.hour < 7 || start.hour >= 22 || end.hour < 7 || end.hour >= 22;
      return { p, start, end, unsociable };
    });
  }, [participants, hearing]);

  const hasWarnings = rows.some((r) => r.unsociable);

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700">Time Zone Grid — Session Times in Local Time</h4>
        {hasWarnings && (
          <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
            ⚠️ Some participants have unsociable hours
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Participant</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Local Time Zone</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Session Start</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Session End</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, start, end, unsociable }, i) => (
              <tr key={p.id} className={`border-b border-slate-50 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/30"} ${unsociable ? "bg-amber-50/40" : ""}`}>
                <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{p.role}</td>
                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{p.timezone}</td>
                <td className={`px-4 py-3 font-mono text-sm font-semibold ${unsociable && (start.hour < 7 || start.hour >= 22) ? "text-amber-700" : "text-slate-700"}`}>
                  {start.display}
                </td>
                <td className={`px-4 py-3 font-mono text-sm font-semibold ${unsociable && (end.hour < 7 || end.hour >= 22) ? "text-amber-700" : "text-slate-700"}`}>
                  {end.display}
                </td>
                <td className="px-4 py-3">
                  {unsociable ? (
                    <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      ⚠️ Unsociable hours
                    </span>
                  ) : (
                    <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                      ✓ Acceptable
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-xs text-slate-400">
        All times shown in each participant's local time zone. ⚠️ flags hours outside 07:00–22:00 local time.
        Hearing timezone of record: <span className="font-mono font-medium text-slate-600">{hearing.timezoneOfRecord}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   WITNESS / EXPERT SCHEDULE
───────────────────────────────────────────── */
function WitnessSection({ hearing, hearingDays }: { hearing: any; hearingDays: string[] }) {
  const { data: schedule = [] } = useListWitnessSchedule(hearing.id);
  const addEntry = useAddWitnessScheduleEntry();
  const updateEntry = useUpdateWitnessScheduleEntry();
  const deleteEntry = useDeleteWitnessScheduleEntry();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    witnessName: "",
    witnessRole: "Witness" as "Witness" | "Expert",
    hearingDay: "",
    chiefExamMins: 30,
    crossExamMins: 30,
    examiningCounsel: "",
    notes: "",
  });
  const sf = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  function openAdd() {
    setEditing(null);
    setForm({
      witnessName: "",
      witnessRole: "Witness",
      hearingDay: hearingDays[0] ?? "",
      chiefExamMins: 30,
      crossExamMins: 30,
      examiningCounsel: "",
      notes: "",
    });
    setModalOpen(true);
  }
  function openEdit(e: any) {
    setEditing(e);
    setForm({
      witnessName: e.witnessName,
      witnessRole: e.witnessRole,
      hearingDay: e.hearingDay,
      chiefExamMins: e.chiefExamMins,
      crossExamMins: e.crossExamMins,
      examiningCounsel: e.examiningCounsel ?? "",
      notes: e.notes ?? "",
    });
    setModalOpen(true);
  }
  async function handleDelete(e: any) {
    if (!confirm(`Remove ${e.witnessName} from schedule?`)) return;
    await deleteEntry.mutateAsync({ hearingId: hearing.id, entryId: e.id }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListWitnessScheduleQueryKey(hearing.id) });
        toast({ title: "Entry removed" });
      },
    });
  }
  async function handleSave(evt: React.FormEvent) {
    evt.preventDefault();
    const payload = {
      ...form,
      chiefExamMins: Number(form.chiefExamMins),
      crossExamMins: Number(form.crossExamMins),
    };
    if (editing) {
      await updateEntry.mutateAsync({ hearingId: hearing.id, entryId: editing.id, data: payload }, {
        onSuccess: () => { qc.invalidateQueries({ queryKey: getListWitnessScheduleQueryKey(hearing.id) }); toast({ title: "Updated" }); setModalOpen(false); },
      });
    } else {
      await addEntry.mutateAsync({ hearingId: hearing.id, data: payload }, {
        onSuccess: () => { qc.invalidateQueries({ queryKey: getListWitnessScheduleQueryKey(hearing.id) }); toast({ title: "Added to schedule" }); setModalOpen(false); },
      });
    }
  }

  const byDay = useMemo(() => {
    const map: Record<string, any[]> = {};
    hearingDays.forEach((d) => { map[d] = []; });
    schedule.forEach((e: any) => {
      if (!map[e.hearingDay]) map[e.hearingDay] = [];
      map[e.hearingDay].push(e);
    });
    return map;
  }, [schedule, hearingDays]);

  const hasAny = schedule.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-[#0F2547] flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-[#0F2547] inline-block" />
          Witness / Expert Schedule
        </h3>
        <Button size="sm" onClick={openAdd} className="bg-[#0F2547] hover:bg-[#1a3a6b] text-white text-xs h-8">
          + Add Entry
        </Button>
      </div>

      {!hasAny ? (
        <p className="text-slate-400 text-sm py-4 text-center border border-dashed border-slate-200 rounded-lg">
          No witness or expert appearances scheduled.
        </p>
      ) : (
        <div className="space-y-3">
          {hearingDays.map((day) => {
            const entries = byDay[day] ?? [];
            if (entries.length === 0) return null;
            return (
              <div key={day} className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                  <span className="text-sm font-semibold text-slate-700">
                    {format(parseISO(day), "EEEE, d MMMM yyyy")}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Examination-in-Chief</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Cross-Examination</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Total</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Examining Counsel</th>
                        <th className="px-4 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((e: any) => (
                        <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-800">{e.witnessName}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${e.witnessRole === "Expert" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                              {e.witnessRole}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{fmtMin(e.chiefExamMins)}</td>
                          <td className="px-4 py-3 text-slate-600">{fmtMin(e.crossExamMins)}</td>
                          <td className="px-4 py-3 font-semibold text-slate-700">{fmtMin(e.chiefExamMins + e.crossExamMins)}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{e.examiningCounsel ?? "—"}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 justify-end">
                              <button onClick={() => openEdit(e)} className="p-1.5 rounded text-slate-400 hover:text-[#0F2547] hover:bg-slate-100">✏️</button>
                              <button onClick={() => handleDelete(e)} className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50">🗑️</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={(o) => !o && setModalOpen(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#0F2547]">{editing ? "Edit Schedule Entry" : "Add to Witness/Expert Schedule"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input className="mt-1" value={form.witnessName} onChange={(e) => sf("witnessName", e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Role</Label>
                <select className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" value={form.witnessRole} onChange={(e) => sf("witnessRole", e.target.value)}>
                  {WITNESS_ROLES.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <Label>Hearing Day</Label>
                <select className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" value={form.hearingDay} onChange={(e) => sf("hearingDay", e.target.value)}>
                  {hearingDays.map((d) => <option key={d} value={d}>{format(parseISO(d), "EEE d MMM yyyy")}</option>)}
                </select>
              </div>
              <div>
                <Label>Chief Examination (minutes)</Label>
                <Input type="number" min={0} className="mt-1" value={form.chiefExamMins} onChange={(e) => sf("chiefExamMins", Number(e.target.value))} />
              </div>
              <div>
                <Label>Cross-Examination (minutes)</Label>
                <Input type="number" min={0} className="mt-1" value={form.crossExamMins} onChange={(e) => sf("crossExamMins", Number(e.target.value))} />
              </div>
            </div>
            <div>
              <Label>Examining Counsel (optional)</Label>
              <Input className="mt-1" value={form.examiningCounsel} onChange={(e) => sf("examiningCounsel", e.target.value)} placeholder="Name of counsel conducting examination" />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea className="mt-1" value={form.notes} onChange={(e) => sf("notes", e.target.value)} rows={2} placeholder="e.g. Appearing by video link, interpreter required" />
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#0F2547] hover:bg-[#1a3a6b] text-white">
                {editing ? "Save Changes" : "Add to Schedule"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PREPARATION CHECKLIST
───────────────────────────────────────────── */
function ChecklistSection({ hearingId }: { hearingId: number }) {
  const { data: items = [] } = useListChecklistItems(hearingId);
  const updateItem = useUpdateChecklistItem();
  const addItem = useAddChecklistItem();
  const deleteItem = useDeleteChecklistItem();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [newLabel, setNewLabel] = useState("");
  const [addingCustom, setAddingCustom] = useState(false);

  const done = items.filter((i: any) => i.isDone).length;
  const total = items.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  async function toggle(item: any) {
    const nowDone = !item.isDone;
    await updateItem.mutateAsync(
      {
        hearingId,
        itemId: item.id,
        data: {
          isDone: nowDone,
          doneDate: nowDone ? new Date().toISOString().split("T")[0] : null,
          notes: item.notes ?? undefined,
        },
      },
      {
        onSuccess: () => qc.invalidateQueries({ queryKey: getListChecklistItemsQueryKey(hearingId) }),
      }
    );
  }

  async function handleAddCustom(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    await addItem.mutateAsync(
      { hearingId, data: { label: newLabel.trim() } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListChecklistItemsQueryKey(hearingId) });
          setNewLabel("");
          setAddingCustom(false);
          toast({ title: "Checklist item added" });
        },
      }
    );
  }

  async function handleDelete(item: any) {
    if (!item.isCustom) return;
    await deleteItem.mutateAsync(
      { hearingId, itemId: item.id },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListChecklistItemsQueryKey(hearingId) });
          toast({ title: "Item removed" });
        },
      }
    );
  }

  async function updateNotes(item: any, notes: string) {
    await updateItem.mutateAsync(
      { hearingId, itemId: item.id, data: { isDone: item.isDone, notes: notes || null } },
      { onSuccess: () => qc.invalidateQueries({ queryKey: getListChecklistItemsQueryKey(hearingId) }) }
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-[#0F2547] flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-[#0F2547] inline-block" />
          Hearing Preparation Checklist
        </h3>
        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-500">
            <span className="font-semibold text-[#0F2547]">{done}</span> / {total} completed
          </div>
          <button
            onClick={() => setAddingCustom(true)}
            className="text-xs px-3 py-1.5 border border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-[#0F2547] hover:text-[#0F2547] transition-all"
          >
            + Custom Item
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#059669" : NAVY }}
        />
      </div>

      {/* Items */}
      <div className="space-y-1.5">
        {items.map((item: any) => (
          <ChecklistRow
            key={item.id}
            item={item}
            onToggle={() => toggle(item)}
            onUpdateNotes={(n) => updateNotes(item, n)}
            onDelete={item.isCustom ? () => handleDelete(item) : undefined}
          />
        ))}
      </div>

      {/* Add Custom Form */}
      <AnimatePresence>
        {addingCustom && (
          <motion.form
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            onSubmit={handleAddCustom}
            className="flex gap-2 items-center"
          >
            <Input
              autoFocus
              placeholder="Custom checklist item…"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="sm" className="bg-[#0F2547] hover:bg-[#1a3a6b] text-white">Add</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setAddingCustom(false)}>Cancel</Button>
          </motion.form>
        )}
      </AnimatePresence>

      {pct === 100 && total > 0 && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-medium">
          ✅ All preparation tasks complete — the hearing is ready.
        </div>
      )}
    </div>
  );
}

function ChecklistRow({
  item,
  onToggle,
  onUpdateNotes,
  onDelete,
}: {
  item: any;
  onToggle: () => void;
  onUpdateNotes: (n: string) => void;
  onDelete?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(item.notes ?? "");

  return (
    <div className={`rounded-lg border transition-all ${item.isDone ? "border-green-200 bg-green-50/30" : "border-slate-200 bg-white"}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={onToggle}
          className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
            item.isDone ? "bg-green-500 border-green-500 text-white" : "border-slate-300 hover:border-[#0F2547]"
          }`}
        >
          {item.isDone && <span className="text-xs font-bold">✓</span>}
        </button>
        <span className={`flex-1 text-sm ${item.isDone ? "line-through text-slate-400" : "text-slate-700"}`}>
          {item.label}
          {item.isCustom && <span className="ml-2 text-xs text-slate-400 italic">Custom</span>}
        </span>
        {item.isDone && item.doneDate && (
          <span className="text-xs text-slate-400 ml-2">
            {format(parseISO(item.doneDate), "d MMM yyyy")}
          </span>
        )}
        <button
          onClick={() => setExpanded((x) => !x)}
          className="text-xs text-slate-400 hover:text-slate-600 px-2 py-0.5 rounded hover:bg-slate-100"
        >
          {expanded ? "▲" : "Notes"}
        </button>
        {onDelete && (
          <button onClick={onDelete} className="text-slate-300 hover:text-red-400 text-sm">✕</button>
        )}
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 flex gap-2">
              <Textarea
                rows={2}
                placeholder="Add notes…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="flex-1 text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => { onUpdateNotes(notes); setExpanded(false); }}
                className="self-end"
              >
                Save
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
