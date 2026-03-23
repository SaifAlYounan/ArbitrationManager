import { useState, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";
import {
  useListRateCard,
  useAddRateCardMember,
  useUpdateRateCardMember,
  useDeleteRateCardMember,
  useListTimeEntries,
  useAddTimeEntry,
  useUpdateTimeEntry,
  useDeleteTimeEntry,
  useListDisbursements,
  useAddDisbursement,
  useUpdateDisbursement,
  useDeleteDisbursement,
  useGetCostsSettings,
  useUpsertCostsSettings,
  getListRateCardQueryKey,
  getListTimeEntriesQueryKey,
  getListDisbursementsQueryKey,
  getGetCostsSettingsQueryKey,
  type RateCardMember,
  type TimeEntry,
  type Disbursement,
  type CostsSettings,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";

const PHASES = [
  "Pre-Arbitration",
  "Written Submissions",
  "Document Production",
  "Hearing Preparation",
  "Hearing",
  "Post-Hearing",
  "Settlement/Negotiation",
  "General Case Management",
] as const;

const DISB_CATEGORIES = [
  "Travel",
  "Expert Fees",
  "Translation",
  "Tribunal Fees",
  "ICC Administrative Costs",
  "Courier",
  "Other",
] as const;

const CURRENCIES = ["USD", "EUR", "GBP", "CHF", "SGD", "AED", "CAD", "AUD"];
const PARTIES = ["Claimant", "Respondent"] as const;

const PHASE_COLORS: Record<string, string> = {
  "Pre-Arbitration": "#0F2547",
  "Written Submissions": "#1e4080",
  "Document Production": "#2860b0",
  "Hearing Preparation": "#4a90d9",
  "Hearing": "#6db3f2",
  "Post-Hearing": "#93c5fd",
  "Settlement/Negotiation": "#c3dafe",
  "General Case Management": "#e0eaff",
};

function fmt(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function num(s: string | null | undefined): number {
  return parseFloat(s ?? "0") || 0;
}

interface Props {
  caseId: number;
  caseRef: string;
}

type ActiveSection = "rateCard" | "timeEntries" | "disbursements" | "iccAdvance" | "summary";

export default function CostsTracker({ caseId, caseRef }: Props) {
  const [activeSection, setActiveSection] = useState<ActiveSection>("summary");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: rateCard = [] } = useListRateCard(caseId);
  const { data: timeEntries = [] } = useListTimeEntries(caseId);
  const { data: disbursements = [] } = useListDisbursements(caseId);
  const { data: costsSettings } = useGetCostsSettings(caseId);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: getListRateCardQueryKey(caseId) });
    qc.invalidateQueries({ queryKey: getListTimeEntriesQueryKey(caseId) });
    qc.invalidateQueries({ queryKey: getListDisbursementsQueryKey(caseId) });
    qc.invalidateQueries({ queryKey: getGetCostsSettingsQueryKey(caseId) });
  };

  const sections: { key: ActiveSection; label: string }[] = [
    { key: "summary", label: "Costs Summary" },
    { key: "rateCard", label: "Team Rate Card" },
    { key: "timeEntries", label: "Time Entries" },
    { key: "disbursements", label: "Disbursements" },
    { key: "iccAdvance", label: "ICC Advance" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[#0F2547]">Costs Tracker</h2>
        <GenerateCostsSubmissionButton
          caseRef={caseRef}
          rateCard={rateCard}
          timeEntries={timeEntries}
          disbursements={disbursements}
          costsSettings={costsSettings ?? null}
        />
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeSection === s.key
                ? "border-[#0F2547] text-[#0F2547]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {activeSection === "summary" && (
        <CostsSummary
          rateCard={rateCard}
          timeEntries={timeEntries}
          disbursements={disbursements}
          costsSettings={costsSettings ?? null}
        />
      )}
      {activeSection === "rateCard" && (
        <RateCardSection
          caseId={caseId}
          rateCard={rateCard}
          onMutate={invalidateAll}
          toast={toast}
        />
      )}
      {activeSection === "timeEntries" && (
        <TimeEntriesSection
          caseId={caseId}
          timeEntries={timeEntries}
          rateCard={rateCard}
          onMutate={invalidateAll}
          toast={toast}
        />
      )}
      {activeSection === "disbursements" && (
        <DisbursementsSection
          caseId={caseId}
          disbursements={disbursements}
          onMutate={invalidateAll}
          toast={toast}
        />
      )}
      {activeSection === "iccAdvance" && (
        <IccAdvanceSection
          caseId={caseId}
          costsSettings={costsSettings ?? null}
          onMutate={invalidateAll}
          toast={toast}
        />
      )}
    </div>
  );
}

/* ─── COSTS SUMMARY ─────────────────────────────────────────────── */

function CostsSummary({
  rateCard,
  timeEntries,
  disbursements,
  costsSettings,
}: {
  rateCard: RateCardMember[];
  timeEntries: TimeEntry[];
  disbursements: Disbursement[];
  costsSettings: CostsSettings | null;
}) {
  const rateMap = useMemo(
    () => new Map(rateCard.map((m) => [m.id, m])),
    [rateCard]
  );

  const phaseData = useMemo(() => {
    const totals: Record<string, number> = {};
    PHASES.forEach((p) => (totals[p] = 0));
    timeEntries.forEach((e) => {
      if (!e.rateCardId) return;
      const member = rateMap.get(e.rateCardId);
      if (!member) return;
      totals[e.phase] = (totals[e.phase] || 0) + num(e.hours) * num(member.hourlyRate);
    });
    return PHASES.map((phase) => ({ phase: phase.replace("/", "/\u200B"), amount: totals[phase] })).filter(
      (d) => d.amount > 0
    );
  }, [timeEntries, rateMap]);

  const memberData = useMemo(() => {
    const totals: Record<string, { name: string; amount: number; currency: string }> = {};
    timeEntries.forEach((e) => {
      if (!e.rateCardId) return;
      const member = rateMap.get(e.rateCardId);
      if (!member) return;
      const cost = num(e.hours) * num(member.hourlyRate);
      if (!totals[member.id]) totals[member.id] = { name: member.name, amount: 0, currency: member.currency };
      totals[member.id].amount += cost;
    });
    return Object.values(totals).sort((a, b) => b.amount - a.amount);
  }, [timeEntries, rateMap]);

  const partyData = useMemo(() => {
    let claimantTime = 0;
    let respondentTime = 0;
    let claimantDisb = 0;
    let respondentDisb = 0;

    timeEntries.forEach((e) => {
      if (!e.rateCardId) return;
      const member = rateMap.get(e.rateCardId);
      if (!member) return;
      const cost = num(e.hours) * num(member.hourlyRate);
      if (member.party === "Claimant") claimantTime += cost;
      else respondentTime += cost;
    });
    disbursements.forEach((d) => {
      if (d.party === "Claimant") claimantDisb += num(d.amount);
      else respondentDisb += num(d.amount);
    });

    return {
      claimantTime,
      claimantDisb,
      respondentTime,
      respondentDisb,
    };
  }, [timeEntries, disbursements, rateMap]);

  const totalTimeCost = memberData.reduce((s, m) => s + m.amount, 0);
  const totalDisbCost = disbursements.reduce((s, d) => s + num(d.amount), 0);
  const grandTotal = totalTimeCost + totalDisbCost;
  const budget = num(costsSettings?.totalBudget);
  const hasBudget = budget > 0;
  const budgetPct = hasBudget ? Math.min((grandTotal / budget) * 100, 100) : 0;

  const advanceAmount = num(costsSettings?.iccAdvanceAmount);
  const claimantPaid = num(costsSettings?.claimantPaid);
  const respondentPaid = num(costsSettings?.respondentPaid);
  const advanceBalance = advanceAmount - claimantPaid - respondentPaid;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Time Costs" value={fmt(totalTimeCost)} />
        <StatCard label="Total Disbursements" value={fmt(totalDisbCost)} />
        <StatCard label="Grand Total" value={fmt(grandTotal)} highlight />
        {hasBudget && (
          <StatCard
            label="vs Budget"
            value={`${budgetPct.toFixed(0)}%`}
            sub={`of ${fmt(budget)}`}
            danger={budgetPct >= 90}
          />
        )}
      </div>

      {hasBudget && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Running Total vs Budget</span>
            <span>
              {fmt(grandTotal)} / {fmt(budget)}
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${budgetPct >= 90 ? "bg-red-500" : budgetPct >= 70 ? "bg-amber-500" : "bg-[#0F2547]"}`}
              style={{ width: `${budgetPct}%` }}
            />
          </div>
        </div>
      )}

      {phaseData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-[#0F2547] mb-3">Total Costs by Phase</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={phaseData} margin={{ top: 4, right: 16, left: 16, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="phase"
                tick={{ fontSize: 10 }}
                angle={-30}
                textAnchor="end"
                interval={0}
              />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} labelFormatter={(l) => l.replace("\u200B", "")} />
              <Bar dataKey="amount" radius={[3, 3, 0, 0]}>
                {phaseData.map((d) => (
                  <Cell key={d.phase} fill={PHASE_COLORS[d.phase.replace("/\u200B", "/")] ?? "#0F2547"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {memberData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-[#0F2547] mb-3">Total Costs by Team Member</h3>
          <div className="space-y-2">
            {memberData.map((m) => {
              const pct = totalTimeCost > 0 ? (m.amount / totalTimeCost) * 100 : 0;
              return (
                <div key={m.name}>
                  <div className="flex justify-between text-sm mb-0.5">
                    <span className="text-gray-700">{m.name}</span>
                    <span className="font-medium text-[#0F2547]">{fmt(m.amount, m.currency)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#0F2547] rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-[#0F2547] mb-3">Claimant Side</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Time Costs</span>
              <span>{fmt(partyData.claimantTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Disbursements</span>
              <span>{fmt(partyData.claimantDisb)}</span>
            </div>
            <div className="flex justify-between font-semibold border-t border-gray-100 pt-1 mt-1">
              <span>Total</span>
              <span>{fmt(partyData.claimantTime + partyData.claimantDisb)}</span>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-[#0F2547] mb-3">Respondent Side</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Time Costs</span>
              <span>{fmt(partyData.respondentTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Disbursements</span>
              <span>{fmt(partyData.respondentDisb)}</span>
            </div>
            <div className="flex justify-between font-semibold border-t border-gray-100 pt-1 mt-1">
              <span>Total</span>
              <span>{fmt(partyData.respondentTime + partyData.respondentDisb)}</span>
            </div>
          </div>
        </div>
      </div>

      {advanceAmount > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-[#0F2547] mb-3">ICC Advance on Costs</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <p className="text-gray-500 text-xs mb-1">Total Advance</p>
              <p className="font-semibold text-[#0F2547]">{fmt(advanceAmount, costsSettings?.iccCurrency)}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500 text-xs mb-1">Total Paid</p>
              <p className="font-semibold text-green-700">{fmt(claimantPaid + respondentPaid, costsSettings?.iccCurrency)}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500 text-xs mb-1">Balance</p>
              <p className={`font-semibold ${advanceBalance > 0 ? "text-red-600" : "text-green-700"}`}>
                {fmt(Math.abs(advanceBalance), costsSettings?.iccCurrency)}
                {advanceBalance > 0 ? " outstanding" : " cleared"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  highlight,
  danger,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${highlight ? "bg-[#0F2547] text-white border-[#0F2547]" : "bg-white border-gray-200"}`}
    >
      <p className={`text-xs mb-1 ${highlight ? "text-blue-200" : "text-gray-500"}`}>{label}</p>
      <p className={`text-lg font-bold ${danger ? "text-red-500" : ""}`}>{value}</p>
      {sub && <p className={`text-xs mt-0.5 ${highlight ? "text-blue-200" : "text-gray-400"}`}>{sub}</p>}
    </div>
  );
}

/* ─── RATE CARD SECTION ──────────────────────────────────────────── */

function RateCardSection({
  caseId,
  rateCard,
  onMutate,
  toast,
}: {
  caseId: number;
  rateCard: RateCardMember[];
  onMutate: () => void;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RateCardMember | null>(null);
  const [form, setForm] = useState({ name: "", role: "", hourlyRate: "", currency: "USD", party: "Claimant" as const });

  const addMutation = useAddRateCardMember();
  const updateMutation = useUpdateRateCardMember();
  const deleteMutation = useDeleteRateCardMember();

  const resetForm = () => {
    setForm({ name: "", role: "", hourlyRate: "", currency: "USD", party: "Claimant" });
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (m: RateCardMember) => {
    setEditing(m);
    setForm({ name: m.name, role: m.role, hourlyRate: m.hourlyRate, currency: m.currency, party: m.party as "Claimant" | "Respondent" });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.name || !form.role || !form.hourlyRate) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    const data = { name: form.name, role: form.role, hourlyRate: form.hourlyRate, currency: form.currency, party: form.party };
    if (editing) {
      updateMutation.mutate(
        { caseId, memberId: editing.id, data },
        { onSuccess: () => { onMutate(); resetForm(); toast({ title: "Member updated" }); }, onError: () => toast({ title: "Update failed", variant: "destructive" }) }
      );
    } else {
      addMutation.mutate(
        { caseId, data },
        { onSuccess: () => { onMutate(); resetForm(); toast({ title: "Member added" }); }, onError: () => toast({ title: "Add failed", variant: "destructive" }) }
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">Define hourly rates for each team member involved in the case.</p>
        <button
          onClick={() => { setEditing(null); setForm({ name: "", role: "", hourlyRate: "", currency: "USD", party: "Claimant" }); setShowForm(true); }}
          className="px-3 py-1.5 text-sm bg-[#0F2547] text-white rounded-md hover:bg-[#1e3a6e]"
        >
          + Add Member
        </button>
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3"
        >
          <h3 className="font-medium text-[#0F2547]">{editing ? "Edit Member" : "Add Team Member"}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Name *</label>
              <input className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Jane Smith" />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Role *</label>
              <input className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="e.g. Lead Counsel" />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Hourly Rate *</label>
              <input type="number" min="0" step="0.01" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} placeholder="500.00" />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Currency</label>
              <select className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Party</label>
              <select className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.party} onChange={(e) => setForm({ ...form, party: e.target.value as "Claimant" | "Respondent" })}>
                {PARTIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={addMutation.isPending || updateMutation.isPending} className="px-3 py-1.5 text-sm bg-[#0F2547] text-white rounded-md hover:bg-[#1e3a6e] disabled:opacity-50">
              {editing ? "Save Changes" : "Add Member"}
            </button>
            <button onClick={resetForm} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
          </div>
        </motion.div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Name</th>
              <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Role</th>
              <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Hourly Rate</th>
              <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Currency</th>
              <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Party</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rateCard.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-gray-400 text-sm">No team members yet. Add the first member above.</td></tr>
            ) : rateCard.map((m) => (
              <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3 font-medium text-[#0F2547]">{m.name}</td>
                <td className="py-2 px-3 text-gray-600">{m.role}</td>
                <td className="py-2 px-3">{fmt(num(m.hourlyRate))}</td>
                <td className="py-2 px-3 text-gray-600">{m.currency}</td>
                <td className="py-2 px-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.party === "Claimant" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}`}>
                    {m.party}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => handleEdit(m)} className="text-xs text-[#0F2547] hover:underline">Edit</button>
                    <button
                      onClick={() => {
                        if (!confirm(`Remove ${m.name} from the rate card?`)) return;
                        deleteMutation.mutate({ caseId, memberId: m.id }, { onSuccess: () => { onMutate(); toast({ title: "Member removed" }); } });
                      }}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── TIME ENTRIES SECTION ───────────────────────────────────────── */

function TimeEntriesSection({
  caseId,
  timeEntries,
  rateCard,
  onMutate,
  toast,
}: {
  caseId: number;
  timeEntries: TimeEntry[];
  rateCard: RateCardMember[];
  onMutate: () => void;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TimeEntry | null>(null);
  const [phaseFilter, setPhaseFilter] = useState("All");
  const blank = { rateCardId: "" as string, memberName: "", date: "", hours: "", phase: PHASES[0] as string, description: "" };
  const [form, setForm] = useState(blank);

  const addMutation = useAddTimeEntry();
  const updateMutation = useUpdateTimeEntry();
  const deleteMutation = useDeleteTimeEntry();

  const rateMap = useMemo(() => new Map(rateCard.map((m) => [m.id, m])), [rateCard]);

  const handleMemberSelect = (rcId: string) => {
    const member = rateCard.find((m) => String(m.id) === rcId);
    setForm((f) => ({ ...f, rateCardId: rcId, memberName: member?.name ?? f.memberName }));
  };

  const resetForm = () => { setForm(blank); setEditing(null); setShowForm(false); };

  const handleEdit = (e: TimeEntry) => {
    setEditing(e);
    setForm({ rateCardId: e.rateCardId ? String(e.rateCardId) : "", memberName: e.memberName, date: e.date, hours: e.hours, phase: e.phase, description: e.description });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.memberName || !form.date || !form.hours || !form.description) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    const data = {
      rateCardId: form.rateCardId ? Number(form.rateCardId) : undefined,
      memberName: form.memberName,
      date: form.date,
      hours: form.hours,
      phase: form.phase,
      description: form.description,
    };
    if (editing) {
      updateMutation.mutate({ caseId, entryId: editing.id, data }, {
        onSuccess: () => { onMutate(); resetForm(); toast({ title: "Entry updated" }); },
        onError: () => toast({ title: "Update failed", variant: "destructive" }),
      });
    } else {
      addMutation.mutate({ caseId, data }, {
        onSuccess: () => { onMutate(); resetForm(); toast({ title: "Time entry logged" }); },
        onError: () => toast({ title: "Log failed", variant: "destructive" }),
      });
    }
  };

  const filtered = phaseFilter === "All" ? timeEntries : timeEntries.filter((e) => e.phase === phaseFilter);
  const totalHours = filtered.reduce((s, e) => s + num(e.hours), 0);
  const totalCost = filtered.reduce((s, e) => {
    const m = e.rateCardId ? rateMap.get(e.rateCardId) : undefined;
    return s + (m ? num(e.hours) * num(m.hourlyRate) : 0);
  }, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <select className="border border-gray-300 rounded px-2 py-1.5 text-sm" value={phaseFilter} onChange={(e) => setPhaseFilter(e.target.value)}>
            <option value="All">All Phases</option>
            {PHASES.map((p) => <option key={p}>{p}</option>)}
          </select>
          {filtered.length > 0 && (
            <span className="text-xs text-gray-500">
              {totalHours.toFixed(1)}h · {fmt(totalCost)}
            </span>
          )}
        </div>
        <button onClick={() => { setEditing(null); setForm(blank); setShowForm(true); }} className="px-3 py-1.5 text-sm bg-[#0F2547] text-white rounded-md hover:bg-[#1e3a6e]">
          + Log Time
        </button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <h3 className="font-medium text-[#0F2547]">{editing ? "Edit Entry" : "Log Time"}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Team Member</label>
              {rateCard.length > 0 ? (
                <select className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.rateCardId} onChange={(e) => handleMemberSelect(e.target.value)}>
                  <option value="">— Custom / not in rate card —</option>
                  {rateCard.map((m) => <option key={m.id} value={m.id}>{m.name} ({fmt(num(m.hourlyRate))}/h)</option>)}
                </select>
              ) : (
                <input className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.memberName} onChange={(e) => setForm({ ...form, memberName: e.target.value })} placeholder="Member name" />
              )}
            </div>
            {(rateCard.length === 0 || !form.rateCardId) && (
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Name *</label>
                <input className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.memberName} onChange={(e) => setForm({ ...form, memberName: e.target.value })} placeholder="e.g. Jane Smith" />
              </div>
            )}
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Date *</label>
              <input type="date" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Hours *</label>
              <input type="number" min="0.1" step="0.1" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} placeholder="2.5" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-600 mb-1 block">Phase *</label>
              <select className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.phase} onChange={(e) => setForm({ ...form, phase: e.target.value })}>
                {PHASES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-600 mb-1 block">Description of Work *</label>
              <textarea rows={2} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Draft memorial section on jurisdiction..." />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={addMutation.isPending || updateMutation.isPending} className="px-3 py-1.5 text-sm bg-[#0F2547] text-white rounded-md hover:bg-[#1e3a6e] disabled:opacity-50">
              {editing ? "Save Changes" : "Log Entry"}
            </button>
            <button onClick={resetForm} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
          </div>
        </motion.div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Date</th>
              <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Member</th>
              <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Phase</th>
              <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Hours</th>
              <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Cost</th>
              <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Description</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-gray-400 text-sm">No time entries{phaseFilter !== "All" ? ` for ${phaseFilter}` : ""}. Log the first entry above.</td></tr>
            ) : filtered.map((e) => {
              const member = e.rateCardId ? rateMap.get(e.rateCardId) : undefined;
              const cost = member ? num(e.hours) * num(member.hourlyRate) : null;
              return (
                <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 text-gray-600 whitespace-nowrap">{formatDate(e.date)}</td>
                  <td className="py-2 px-3 font-medium text-[#0F2547]">{e.memberName}</td>
                  <td className="py-2 px-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 font-medium whitespace-nowrap">{e.phase}</span>
                  </td>
                  <td className="py-2 px-3 text-center">{num(e.hours).toFixed(1)}h</td>
                  <td className="py-2 px-3 font-medium">{cost !== null ? fmt(cost, member?.currency) : <span className="text-gray-400 text-xs">No rate</span>}</td>
                  <td className="py-2 px-3 text-gray-600 max-w-xs truncate">{e.description}</td>
                  <td className="py-2 px-3">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => handleEdit(e)} className="text-xs text-[#0F2547] hover:underline">Edit</button>
                      <button onClick={() => { if (!confirm("Delete this time entry?")) return; deleteMutation.mutate({ caseId, entryId: e.id }, { onSuccess: () => { onMutate(); toast({ title: "Entry deleted" }); } }); }} className="text-xs text-red-500 hover:underline">Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── DISBURSEMENTS SECTION ──────────────────────────────────────── */

function DisbursementsSection({
  caseId,
  disbursements,
  onMutate,
  toast,
}: {
  caseId: number;
  disbursements: Disbursement[];
  onMutate: () => void;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Disbursement | null>(null);
  const blank = { category: DISB_CATEGORIES[0] as string, amount: "", currency: "USD", date: "", description: "", docRef: "", party: "Claimant" as const };
  const [form, setForm] = useState(blank);

  const addMutation = useAddDisbursement();
  const updateMutation = useUpdateDisbursement();
  const deleteMutation = useDeleteDisbursement();

  const resetForm = () => { setForm(blank); setEditing(null); setShowForm(false); };

  const handleEdit = (d: Disbursement) => {
    setEditing(d);
    setForm({ category: d.category, amount: d.amount, currency: d.currency, date: d.date, description: d.description, docRef: d.docRef ?? "", party: d.party as "Claimant" | "Respondent" });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.amount || !form.date || !form.description) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    const data = { category: form.category, amount: form.amount, currency: form.currency, date: form.date, description: form.description, docRef: form.docRef || undefined, party: form.party };
    if (editing) {
      updateMutation.mutate({ caseId, disbId: editing.id, data }, {
        onSuccess: () => { onMutate(); resetForm(); toast({ title: "Disbursement updated" }); },
        onError: () => toast({ title: "Update failed", variant: "destructive" }),
      });
    } else {
      addMutation.mutate({ caseId, data }, {
        onSuccess: () => { onMutate(); resetForm(); toast({ title: "Disbursement logged" }); },
        onError: () => toast({ title: "Log failed", variant: "destructive" }),
      });
    }
  };

  const total = disbursements.reduce((s, d) => s + num(d.amount), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-600">Log non-time costs: expert fees, travel, translation, etc.</p>
          {disbursements.length > 0 && <p className="text-xs text-gray-500 mt-0.5">Total: {fmt(total)}</p>}
        </div>
        <button onClick={() => { setEditing(null); setForm(blank); setShowForm(true); }} className="px-3 py-1.5 text-sm bg-[#0F2547] text-white rounded-md hover:bg-[#1e3a6e]">
          + Add Disbursement
        </button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <h3 className="font-medium text-[#0F2547]">{editing ? "Edit Disbursement" : "Add Disbursement"}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Category *</label>
              <select className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {DISB_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Party</label>
              <select className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.party} onChange={(e) => setForm({ ...form, party: e.target.value as "Claimant" | "Respondent" })}>
                {PARTIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Amount *</label>
              <input type="number" min="0" step="0.01" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Currency</label>
              <select className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Date *</label>
              <input type="date" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Document Reference</label>
              <input className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.docRef} onChange={(e) => setForm({ ...form, docRef: e.target.value })} placeholder="e.g. INV-2024-001" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-600 mb-1 block">Description *</label>
              <textarea rows={2} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Expert witness fee for Dr. Smith..." />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={addMutation.isPending || updateMutation.isPending} className="px-3 py-1.5 text-sm bg-[#0F2547] text-white rounded-md hover:bg-[#1e3a6e] disabled:opacity-50">
              {editing ? "Save Changes" : "Add Disbursement"}
            </button>
            <button onClick={resetForm} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
          </div>
        </motion.div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Date</th>
              <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Category</th>
              <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Party</th>
              <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Amount</th>
              <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Description</th>
              <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Doc Ref</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {disbursements.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-gray-400 text-sm">No disbursements logged yet.</td></tr>
            ) : disbursements.map((d) => (
              <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3 text-gray-600 whitespace-nowrap">{formatDate(d.date)}</td>
                <td className="py-2 px-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-medium whitespace-nowrap">{d.category}</span>
                </td>
                <td className="py-2 px-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.party === "Claimant" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}`}>{d.party}</span>
                </td>
                <td className="py-2 px-3 font-medium whitespace-nowrap">{fmt(num(d.amount), d.currency)}</td>
                <td className="py-2 px-3 text-gray-600 max-w-xs truncate">{d.description}</td>
                <td className="py-2 px-3 text-gray-500 text-xs">{d.docRef ?? "—"}</td>
                <td className="py-2 px-3">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => handleEdit(d)} className="text-xs text-[#0F2547] hover:underline">Edit</button>
                    <button onClick={() => { if (!confirm("Delete this disbursement?")) return; deleteMutation.mutate({ caseId, disbId: d.id }, { onSuccess: () => { onMutate(); toast({ title: "Disbursement deleted" }); } }); }} className="text-xs text-red-500 hover:underline">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── ICC ADVANCE SECTION ────────────────────────────────────────── */

function IccAdvanceSection({
  caseId,
  costsSettings,
  onMutate,
  toast,
}: {
  caseId: number;
  costsSettings: CostsSettings | null;
  onMutate: () => void;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    iccAdvanceAmount: costsSettings?.iccAdvanceAmount ?? "",
    iccCurrency: costsSettings?.iccCurrency ?? "USD",
    claimantPaid: costsSettings?.claimantPaid ?? "0",
    respondentPaid: costsSettings?.respondentPaid ?? "0",
    totalBudget: costsSettings?.totalBudget ?? "",
    budgetCurrency: costsSettings?.budgetCurrency ?? "USD",
    notes: costsSettings?.notes ?? "",
  });

  const upsertMutation = useUpsertCostsSettings();

  const handleEdit = () => {
    setForm({
      iccAdvanceAmount: costsSettings?.iccAdvanceAmount ?? "",
      iccCurrency: costsSettings?.iccCurrency ?? "USD",
      claimantPaid: costsSettings?.claimantPaid ?? "0",
      respondentPaid: costsSettings?.respondentPaid ?? "0",
      totalBudget: costsSettings?.totalBudget ?? "",
      budgetCurrency: costsSettings?.budgetCurrency ?? "USD",
      notes: costsSettings?.notes ?? "",
    });
    setEditing(true);
  };

  const handleSave = () => {
    upsertMutation.mutate(
      {
        caseId,
        data: {
          iccAdvanceAmount: form.iccAdvanceAmount || undefined,
          iccCurrency: form.iccCurrency,
          claimantPaid: form.claimantPaid || "0",
          respondentPaid: form.respondentPaid || "0",
          totalBudget: form.totalBudget || undefined,
          budgetCurrency: form.budgetCurrency,
          notes: form.notes || undefined,
        },
      },
      {
        onSuccess: () => { onMutate(); setEditing(false); toast({ title: "Settings saved" }); },
        onError: () => toast({ title: "Save failed", variant: "destructive" }),
      }
    );
  };

  const advance = num(costsSettings?.iccAdvanceAmount);
  const claimantPaid = num(costsSettings?.claimantPaid);
  const respondentPaid = num(costsSettings?.respondentPaid);
  const totalPaid = claimantPaid + respondentPaid;
  const balance = advance - totalPaid;
  const halfAdvance = advance / 2;
  const claimantBehind = advance > 0 && claimantPaid < halfAdvance;
  const respondentBehind = advance > 0 && respondentPaid < halfAdvance;
  const currency = costsSettings?.iccCurrency ?? "USD";

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">Track the ICC advance on costs, payments by each party, and your overall budget.</p>
        {!editing && (
          <button onClick={handleEdit} className="px-3 py-1.5 text-sm bg-[#0F2547] text-white rounded-md hover:bg-[#1e3a6e]">
            {costsSettings?.iccAdvanceAmount ? "Edit Settings" : "Set Up"}
          </button>
        )}
      </div>

      {editing ? (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
          <h3 className="font-medium text-[#0F2547]">ICC Advance & Budget Settings</h3>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">ICC Advance on Costs</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Total Advance Amount</label>
                <input type="number" min="0" step="0.01" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.iccAdvanceAmount} onChange={(e) => setForm({ ...form, iccAdvanceAmount: e.target.value })} placeholder="0.00" />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Currency</label>
                <select className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.iccCurrency} onChange={(e) => setForm({ ...form, iccCurrency: e.target.value })}>
                  {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Claimant Paid</label>
                <input type="number" min="0" step="0.01" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.claimantPaid} onChange={(e) => setForm({ ...form, claimantPaid: e.target.value })} placeholder="0.00" />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Respondent Paid</label>
                <input type="number" min="0" step="0.01" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.respondentPaid} onChange={(e) => setForm({ ...form, respondentPaid: e.target.value })} placeholder="0.00" />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Legal Costs Budget (optional)</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Total Budget</label>
                <input type="number" min="0" step="0.01" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.totalBudget} onChange={(e) => setForm({ ...form, totalBudget: e.target.value })} placeholder="Leave blank if no budget" />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Currency</label>
                <select className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.budgetCurrency} onChange={(e) => setForm({ ...form, budgetCurrency: e.target.value })}>
                  {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-600 mb-1 block">Notes</label>
            <textarea rows={2} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any notes on advance payments, instalment schedule, etc." />
          </div>

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={upsertMutation.isPending} className="px-3 py-1.5 text-sm bg-[#0F2547] text-white rounded-md hover:bg-[#1e3a6e] disabled:opacity-50">Save Settings</button>
            <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
          </div>
        </motion.div>
      ) : advance > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total ICC Advance" value={fmt(advance, currency)} />
            <StatCard label="Total Paid" value={fmt(totalPaid, currency)} />
            <StatCard label="Balance Outstanding" value={fmt(Math.abs(balance), currency)} danger={balance > 0} />
            {costsSettings?.totalBudget && (
              <StatCard label="Legal Costs Budget" value={fmt(num(costsSettings.totalBudget), costsSettings.budgetCurrency)} />
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-2 px-4 text-xs text-gray-500 font-medium">Party</th>
                  <th className="text-left py-2 px-4 text-xs text-gray-500 font-medium">Expected (50%)</th>
                  <th className="text-left py-2 px-4 text-xs text-gray-500 font-medium">Paid</th>
                  <th className="text-left py-2 px-4 text-xs text-gray-500 font-medium">Outstanding</th>
                  <th className="text-left py-2 px-4 text-xs text-gray-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Claimant", paid: claimantPaid, behind: claimantBehind },
                  { label: "Respondent", paid: respondentPaid, behind: respondentBehind },
                ].map((row) => {
                  const outstanding = Math.max(halfAdvance - row.paid, 0);
                  return (
                    <tr key={row.label} className="border-t border-gray-100">
                      <td className="py-3 px-4 font-medium text-[#0F2547]">{row.label}</td>
                      <td className="py-3 px-4 text-gray-600">{fmt(halfAdvance, currency)}</td>
                      <td className="py-3 px-4">{fmt(row.paid, currency)}</td>
                      <td className="py-3 px-4 text-gray-600">{outstanding > 0 ? fmt(outstanding, currency) : "—"}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${row.behind ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                          {row.behind ? "⚠ Behind" : "✓ Paid"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {costsSettings?.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <span className="font-medium">Notes: </span>{costsSettings.notes}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-8 text-center">
          <p className="text-gray-500 text-sm">No ICC advance information recorded yet.</p>
          <p className="text-gray-400 text-xs mt-1">Click "Set Up" to record the advance amount and track payments.</p>
        </div>
      )}
    </div>
  );
}

/* ─── GENERATE COSTS SUBMISSION ──────────────────────────────────── */

function GenerateCostsSubmissionButton({
  caseRef,
  rateCard,
  timeEntries,
  disbursements,
  costsSettings,
}: {
  caseRef: string;
  rateCard: RateCardMember[];
  timeEntries: TimeEntry[];
  disbursements: Disbursement[];
  costsSettings: CostsSettings | null;
}) {
  const handleGenerate = () => {
    const rateMap = new Map(rateCard.map((m) => [m.id, m]));
    const currency = costsSettings?.budgetCurrency ?? "USD";

    const phaseGroups: Record<string, { entries: TimeEntry[]; total: number }> = {};
    PHASES.forEach((p) => (phaseGroups[p] = { entries: [], total: 0 }));

    timeEntries.forEach((e) => {
      const member = e.rateCardId ? rateMap.get(e.rateCardId) : undefined;
      const cost = member ? num(e.hours) * num(member.hourlyRate) : 0;
      phaseGroups[e.phase].entries.push(e);
      phaseGroups[e.phase].total += cost;
    });

    const totalTimeCost = timeEntries.reduce((s, e) => {
      const m = e.rateCardId ? rateMap.get(e.rateCardId) : undefined;
      return s + (m ? num(e.hours) * num(m.hourlyRate) : 0);
    }, 0);
    const totalDisbCost = disbursements.reduce((s, d) => s + num(d.amount), 0);
    const grandTotal = totalTimeCost + totalDisbCost;

    const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

    const phaseRows = PHASES.filter((p) => phaseGroups[p].entries.length > 0)
      .map((phase) => {
        const { entries, total } = phaseGroups[phase];
        const rows = entries
          .map((e) => {
            const member = e.rateCardId ? rateMap.get(e.rateCardId) : undefined;
            const cost = member ? num(e.hours) * num(member.hourlyRate) : 0;
            return `<tr>
              <td style="padding:4px 8px;border-bottom:1px solid #eee;">${e.date}</td>
              <td style="padding:4px 8px;border-bottom:1px solid #eee;">${e.memberName}${member ? ` (${member.role})` : ""}</td>
              <td style="padding:4px 8px;border-bottom:1px solid #eee;">${e.description}</td>
              <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right;">${num(e.hours).toFixed(1)}</td>
              <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right;">${member ? fmt(num(member.hourlyRate), member.currency) : "—"}</td>
              <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right;">${cost > 0 ? fmt(cost, member?.currency) : "—"}</td>
            </tr>`;
          })
          .join("");
        return `
          <h3 style="font-size:13px;color:#0F2547;margin:20px 0 6px;">${phase}</h3>
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead><tr style="background:#f5f7fa;">
              <th style="padding:6px 8px;text-align:left;font-weight:600;border-bottom:2px solid #0F2547;">Date</th>
              <th style="padding:6px 8px;text-align:left;font-weight:600;border-bottom:2px solid #0F2547;">Timekeeper</th>
              <th style="padding:6px 8px;text-align:left;font-weight:600;border-bottom:2px solid #0F2547;">Description</th>
              <th style="padding:6px 8px;text-align:right;font-weight:600;border-bottom:2px solid #0F2547;">Hours</th>
              <th style="padding:6px 8px;text-align:right;font-weight:600;border-bottom:2px solid #0F2547;">Rate</th>
              <th style="padding:6px 8px;text-align:right;font-weight:600;border-bottom:2px solid #0F2547;">Amount</th>
            </tr></thead>
            <tbody>${rows}</tbody>
            <tfoot><tr style="background:#f5f7fa;">
              <td colspan="5" style="padding:6px 8px;font-weight:600;text-align:right;">Phase Total:</td>
              <td style="padding:6px 8px;font-weight:700;text-align:right;color:#0F2547;">${fmt(total)}</td>
            </tr></tfoot>
          </table>`;
      })
      .join("");

    const disbRows = disbursements.length > 0
      ? `<h2 style="font-size:15px;color:#0F2547;margin:30px 0 8px;border-bottom:2px solid #0F2547;padding-bottom:4px;">PART II — DISBURSEMENTS</h2>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead><tr style="background:#f5f7fa;">
            <th style="padding:6px 8px;text-align:left;font-weight:600;border-bottom:2px solid #0F2547;">Date</th>
            <th style="padding:6px 8px;text-align:left;font-weight:600;border-bottom:2px solid #0F2547;">Category</th>
            <th style="padding:6px 8px;text-align:left;font-weight:600;border-bottom:2px solid #0F2547;">Party</th>
            <th style="padding:6px 8px;text-align:left;font-weight:600;border-bottom:2px solid #0F2547;">Description</th>
            <th style="padding:6px 8px;text-align:left;font-weight:600;border-bottom:2px solid #0F2547;">Doc Ref</th>
            <th style="padding:6px 8px;text-align:right;font-weight:600;border-bottom:2px solid #0F2547;">Amount</th>
          </tr></thead>
          <tbody>
            ${disbursements.map((d) => `<tr>
              <td style="padding:4px 8px;border-bottom:1px solid #eee;">${d.date}</td>
              <td style="padding:4px 8px;border-bottom:1px solid #eee;">${d.category}</td>
              <td style="padding:4px 8px;border-bottom:1px solid #eee;">${d.party}</td>
              <td style="padding:4px 8px;border-bottom:1px solid #eee;">${d.description}</td>
              <td style="padding:4px 8px;border-bottom:1px solid #eee;">${d.docRef ?? "—"}</td>
              <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right;">${fmt(num(d.amount), d.currency)}</td>
            </tr>`).join("")}
          </tbody>
          <tfoot><tr style="background:#f5f7fa;">
            <td colspan="5" style="padding:6px 8px;font-weight:600;text-align:right;">Total Disbursements:</td>
            <td style="padding:6px 8px;font-weight:700;text-align:right;color:#0F2547;">${fmt(totalDisbCost)}</td>
          </tr></tfoot>
        </table>`
      : "";

    const rateCardTable = rateCard.length > 0
      ? `<h2 style="font-size:15px;color:#0F2547;margin:30px 0 8px;border-bottom:2px solid #0F2547;padding-bottom:4px;">ANNEXURE — TEAM RATE CARD</h2>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead><tr style="background:#f5f7fa;">
            <th style="padding:6px 8px;text-align:left;font-weight:600;border-bottom:2px solid #0F2547;">Name</th>
            <th style="padding:6px 8px;text-align:left;font-weight:600;border-bottom:2px solid #0F2547;">Role</th>
            <th style="padding:6px 8px;text-align:right;font-weight:600;border-bottom:2px solid #0F2547;">Hourly Rate</th>
            <th style="padding:6px 8px;text-align:left;font-weight:600;border-bottom:2px solid #0F2547;">Currency</th>
            <th style="padding:6px 8px;text-align:left;font-weight:600;border-bottom:2px solid #0F2547;">Party</th>
          </tr></thead>
          <tbody>
            ${rateCard.map((m) => `<tr>
              <td style="padding:4px 8px;border-bottom:1px solid #eee;">${m.name}</td>
              <td style="padding:4px 8px;border-bottom:1px solid #eee;">${m.role}</td>
              <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right;">${fmt(num(m.hourlyRate), m.currency)}</td>
              <td style="padding:4px 8px;border-bottom:1px solid #eee;">${m.currency}</td>
              <td style="padding:4px 8px;border-bottom:1px solid #eee;">${m.party}</td>
            </tr>`).join("")}
          </tbody>
        </table>`
      : "";

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Costs Statement — ${caseRef}</title>
<style>
  @media print { body { margin: 0; } .no-print { display: none; } }
  body { font-family: Georgia, 'Times New Roman', serif; color: #222; max-width: 900px; margin: 40px auto; padding: 0 40px; font-size: 13px; line-height: 1.5; }
  h1 { font-size: 18px; color: #0F2547; margin-bottom: 4px; }
  .subtitle { color: #555; font-size: 13px; margin-bottom: 24px; }
  .summary-box { background: #f5f7fa; border: 1px solid #d0d8e8; border-radius: 6px; padding: 16px; margin: 24px 0; display: flex; gap: 32px; }
  .summary-item { text-align: center; }
  .summary-label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
  .summary-value { font-size: 16px; font-weight: bold; color: #0F2547; }
  .grand-total { font-size: 20px; }
</style>
</head>
<body>
<button class="no-print" onclick="window.print()" style="position:fixed;top:16px;right:16px;background:#0F2547;color:#fff;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;font-size:13px;">Print / Save as PDF</button>

<h1>COSTS STATEMENT</h1>
<p class="subtitle">Case Reference: <strong>${caseRef}</strong> &nbsp;|&nbsp; Date: ${today}</p>

<div class="summary-box">
  <div class="summary-item"><div class="summary-label">Time Costs</div><div class="summary-value">${fmt(totalTimeCost)}</div></div>
  <div class="summary-item"><div class="summary-label">Disbursements</div><div class="summary-value">${fmt(totalDisbCost)}</div></div>
  <div class="summary-item"><div class="summary-label">Grand Total</div><div class="summary-value grand-total">${fmt(grandTotal)}</div></div>
  ${costsSettings?.totalBudget ? `<div class="summary-item"><div class="summary-label">vs Budget</div><div class="summary-value" style="color:${grandTotal > num(costsSettings.totalBudget) ? '#dc2626' : '#16a34a'};">${((grandTotal / num(costsSettings.totalBudget)) * 100).toFixed(0)}%</div></div>` : ""}
</div>

<h2 style="font-size:15px;color:#0F2547;margin:30px 0 8px;border-bottom:2px solid #0F2547;padding-bottom:4px;">PART I — LEGAL FEES (TIME-BASED)</h2>
${phaseRows || "<p style='color:#999;font-style:italic;'>No time entries recorded.</p>"}

<table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:12px;background:#e8edf5;">
  <tr>
    <td style="padding:8px;font-weight:700;font-size:14px;color:#0F2547;">TOTAL TIME COSTS</td>
    <td style="padding:8px;font-weight:700;font-size:14px;color:#0F2547;text-align:right;">${fmt(totalTimeCost)}</td>
  </tr>
</table>

${disbRows}

<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:24px;background:#0F2547;color:#fff;">
  <tr>
    <td style="padding:12px;font-weight:700;font-size:15px;">GRAND TOTAL</td>
    <td style="padding:12px;font-weight:700;font-size:15px;text-align:right;">${fmt(grandTotal)}</td>
  </tr>
</table>

${rateCardTable}

<p style="margin-top:40px;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:12px;">This costs statement is generated from the Procedural Manager system. All figures are in the currency stated next to each amount. Where multiple currencies are used, amounts may not be directly comparable without conversion.</p>
</body>
</html>`;

    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  };

  return (
    <button
      onClick={handleGenerate}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-[#0F2547] text-[#0F2547] rounded-md hover:bg-[#0F2547] hover:text-white transition-colors"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
      Generate Costs Statement
    </button>
  );
}
