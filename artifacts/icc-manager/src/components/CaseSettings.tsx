import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Trash2, Plus, Scale } from "lucide-react";
import {
  useUpdateCase,
  useAddTribunalMember,
  useDeleteTribunalMember,
  useAddRepresentative,
  useDeleteRepresentative,
  useUpsertCostsSettings,
  useGetCostsSettings,
  getGetCaseQueryKey,
  getGetCostsSettingsQueryKey,
  ApplicableRules,
  CaseStatus,
  TribunalRole,
  RepresentativeRole,
  RepresentativeParty,
} from "@workspace/api-client-react";
import type { TribunalMember, Representative } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";

type SettingsSection = "case" | "tribunal" | "reps" | "budget" | "reminders";

interface CaseData {
  id: number;
  caseName: string;
  caseReference: string;
  claimants: string;
  respondents: string;
  seatOfArbitration?: string;
  languageOfArbitration?: string;
  applicableRules?: string;
  dateOfRequest?: string;
  currency?: string;
  status: string;
  tribunalMembers: TribunalMember[];
  representatives: Representative[];
}

interface Props {
  caseId: number;
  caseData: CaseData;
  onInvalidate: () => void;
}

export default function CaseSettings({ caseId, caseData, onInvalidate }: Props) {
  const [section, setSection] = useState<SettingsSection>("case");

  const subSections: { id: SettingsSection; label: string }[] = [
    { id: "case", label: "Case Details" },
    { id: "tribunal", label: "Tribunal" },
    { id: "reps", label: "Representatives" },
    { id: "budget", label: "Budget & Costs" },
    { id: "reminders", label: "Reminders" },
  ];

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-[#0F2547]">Settings</h2>

      <div className="flex gap-1 border-b border-gray-200 flex-wrap">
        {subSections.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              section === s.id
                ? "border-[#0F2547] text-[#0F2547]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <motion.div key={section} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
        {section === "case" && <CaseDetailsSection caseId={caseId} caseData={caseData} onInvalidate={onInvalidate} />}
        {section === "tribunal" && <TribunalSection caseId={caseId} caseData={caseData} onInvalidate={onInvalidate} />}
        {section === "reps" && <RepsSection caseId={caseId} caseData={caseData} onInvalidate={onInvalidate} />}
        {section === "budget" && <BudgetSection caseId={caseId} />}
        {section === "reminders" && <RemindersSection caseId={caseId} />}
      </motion.div>
    </div>
  );
}

/* ── CASE DETAILS ── */
function CaseDetailsSection({ caseId, caseData, onInvalidate }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    caseName: caseData.caseName,
    caseReference: caseData.caseReference,
    claimants: caseData.claimants,
    respondents: caseData.respondents,
    seatOfArbitration: caseData.seatOfArbitration ?? "",
    languageOfArbitration: caseData.languageOfArbitration ?? "",
    applicableRules: caseData.applicableRules ?? "",
    dateOfRequest: caseData.dateOfRequest ?? "",
    currency: caseData.currency ?? "USD",
    status: caseData.status,
  });

  useEffect(() => {
    setForm({
      caseName: caseData.caseName,
      caseReference: caseData.caseReference,
      claimants: caseData.claimants,
      respondents: caseData.respondents,
      seatOfArbitration: caseData.seatOfArbitration ?? "",
      languageOfArbitration: caseData.languageOfArbitration ?? "",
      applicableRules: caseData.applicableRules ?? "",
      dateOfRequest: caseData.dateOfRequest ?? "",
      currency: caseData.currency ?? "USD",
      status: caseData.status,
    });
  }, [caseData]);

  const updateCase = useUpdateCase({
    mutation: {
      onSuccess: () => { onInvalidate(); toast({ title: "Case details saved" }); },
      onError: (e) => toast({ title: "Save failed", description: (e as any).message, variant: "destructive" }),
    },
  });

  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="text-xs font-medium text-gray-600 mb-1 block">{label}</label>
      {children}
    </div>
  );

  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2547]/30";

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <F label="Case Reference *">
          <input className={inputCls} value={form.caseReference} onChange={(e) => setForm({ ...form, caseReference: e.target.value })} />
        </F>
        <F label="Case Name *">
          <input className={inputCls} value={form.caseName} onChange={(e) => setForm({ ...form, caseName: e.target.value })} />
        </F>
        <div className="col-span-2">
          <F label="Claimant(s) *">
            <textarea rows={2} className={inputCls} value={form.claimants} onChange={(e) => setForm({ ...form, claimants: e.target.value })} />
          </F>
        </div>
        <div className="col-span-2">
          <F label="Respondent(s) *">
            <textarea rows={2} className={inputCls} value={form.respondents} onChange={(e) => setForm({ ...form, respondents: e.target.value })} />
          </F>
        </div>
        <F label="Seat of Arbitration">
          <input className={inputCls} value={form.seatOfArbitration} onChange={(e) => setForm({ ...form, seatOfArbitration: e.target.value })} placeholder="e.g. Paris, London, Geneva" />
        </F>
        <F label="Language">
          <input className={inputCls} value={form.languageOfArbitration} onChange={(e) => setForm({ ...form, languageOfArbitration: e.target.value })} placeholder="e.g. English" />
        </F>
        <F label="Applicable Rules">
          <select className={inputCls} value={form.applicableRules} onChange={(e) => setForm({ ...form, applicableRules: e.target.value })}>
            <option value="">— Select —</option>
            {Object.values(ApplicableRules).map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </F>
        <F label="Date of Request">
          <input type="date" className={inputCls} value={form.dateOfRequest} onChange={(e) => setForm({ ...form, dateOfRequest: e.target.value })} />
        </F>
        <F label="Currency">
          <input className={inputCls} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} placeholder="USD" />
        </F>
        <F label="Status">
          <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {Object.values(CaseStatus).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </F>
      </div>
      <button
        onClick={() => updateCase.mutate({ id: caseId, data: form as any })}
        disabled={updateCase.isPending}
        className="px-4 py-2 bg-[#0F2547] text-white text-sm rounded-lg hover:bg-[#1e3a6e] disabled:opacity-50"
      >
        {updateCase.isPending ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}

/* ── TRIBUNAL ── */
function TribunalSection({ caseId, caseData, onInvalidate }: Props) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", role: TribunalRole.SoleArbitrator, email: "", timeZone: "" });

  const addMutation = useAddTribunalMember({
    mutation: {
      onSuccess: () => { onInvalidate(); setShowForm(false); setForm({ name: "", role: TribunalRole.SoleArbitrator, email: "", timeZone: "" }); toast({ title: "Member added" }); },
      onError: () => toast({ title: "Failed to add member", variant: "destructive" }),
    },
  });

  const deleteMutation = useDeleteTribunalMember({
    mutation: {
      onSuccess: () => { onInvalidate(); toast({ title: "Member removed" }); },
      onError: () => toast({ title: "Failed to remove member", variant: "destructive" }),
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-[#0F2547]">Arbitral Tribunal</h3>
          <p className="text-sm text-gray-500">Manage the appointed arbitrators.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-3 py-1.5 text-sm bg-[#0F2547] text-white rounded-md hover:bg-[#1e3a6e] flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Add Member
        </button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          <h4 className="font-medium text-[#0F2547]">Add Tribunal Member</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Name *</label>
              <input className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Role</label>
              <select className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as any })}>
                {Object.values(TribunalRole).map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Email</label>
              <input type="email" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="arbitrator@example.com" />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Time Zone</label>
              <input className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.timeZone} onChange={(e) => setForm({ ...form, timeZone: e.target.value })} placeholder="e.g. Europe/Paris" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => addMutation.mutate({ caseId, data: form })} disabled={!form.name || addMutation.isPending} className="px-3 py-1.5 text-sm bg-[#0F2547] text-white rounded-md hover:bg-[#1e3a6e] disabled:opacity-50">Add Member</button>
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md">Cancel</button>
          </div>
        </motion.div>
      )}

      {caseData.tribunalMembers.length === 0 ? (
        <div className="p-10 text-center border border-dashed border-gray-300 rounded-xl bg-gray-50">
          <Scale className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No tribunal members appointed yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-2.5 px-4 text-xs text-gray-500 font-semibold uppercase tracking-wide">Name</th>
                <th className="text-left py-2.5 px-4 text-xs text-gray-500 font-semibold uppercase tracking-wide">Role</th>
                <th className="text-left py-2.5 px-4 text-xs text-gray-500 font-semibold uppercase tracking-wide">Email</th>
                <th className="text-left py-2.5 px-4 text-xs text-gray-500 font-semibold uppercase tracking-wide">Time Zone</th>
                <th className="print:hidden" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {caseData.tribunalMembers.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-[#0F2547]">{m.name}</td>
                  <td className="py-3 px-4">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#0F2547]/10 text-[#0F2547] font-medium">{m.role}</span>
                  </td>
                  <td className="py-3 px-4 text-gray-500">{m.email}</td>
                  <td className="py-3 px-4 text-gray-500">{m.timeZone}</td>
                  <td className="py-3 px-4 text-right print:hidden">
                    <button onClick={() => { if (!confirm(`Remove ${m.name}?`)) return; deleteMutation.mutate({ caseId, memberId: m.id }); }} className="text-red-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── REPRESENTATIVES ── */
function RepsSection({ caseId, caseData, onInvalidate }: Props) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", firm: "", role: RepresentativeRole.LeadCounsel, party: RepresentativeParty.Claimant, email: "", timeZone: "" });

  const addMutation = useAddRepresentative({
    mutation: {
      onSuccess: () => { onInvalidate(); setShowForm(false); setForm({ name: "", firm: "", role: RepresentativeRole.LeadCounsel, party: RepresentativeParty.Claimant, email: "", timeZone: "" }); toast({ title: "Representative added" }); },
      onError: () => toast({ title: "Failed to add representative", variant: "destructive" }),
    },
  });

  const deleteMutation = useDeleteRepresentative({
    mutation: {
      onSuccess: () => { onInvalidate(); toast({ title: "Representative removed" }); },
    },
  });

  const claimantsReps = caseData.representatives.filter((r) => r.party === RepresentativeParty.Claimant);
  const respondentsReps = caseData.representatives.filter((r) => r.party === RepresentativeParty.Respondent);

  const inputCls = "w-full border border-gray-300 rounded px-2 py-1.5 text-sm";

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-[#0F2547]">Party Representatives</h3>
          <p className="text-sm text-gray-500">Manage external counsel representing both parties.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-3 py-1.5 text-sm bg-[#0F2547] text-white rounded-md hover:bg-[#1e3a6e] flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Add Representative
        </button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          <h4 className="font-medium text-[#0F2547]">Add Representative</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Name *</label>
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Firm</label>
              <input className={inputCls} value={form.firm} onChange={(e) => setForm({ ...form, firm: e.target.value })} placeholder="Law firm name" />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Party</label>
              <select className={inputCls} value={form.party} onChange={(e) => setForm({ ...form, party: e.target.value as any })}>
                {Object.values(RepresentativeParty).map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Role</label>
              <select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as any })}>
                {Object.values(RepresentativeRole).map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Email</label>
              <input type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Time Zone</label>
              <input className={inputCls} value={form.timeZone} onChange={(e) => setForm({ ...form, timeZone: e.target.value })} placeholder="e.g. America/New_York" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => addMutation.mutate({ caseId, data: form })} disabled={!form.name || addMutation.isPending} className="px-3 py-1.5 text-sm bg-[#0F2547] text-white rounded-md disabled:opacity-50">Add Representative</button>
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md">Cancel</button>
          </div>
        </motion.div>
      )}

      {[{ label: "Claimant", reps: claimantsReps }, { label: "Respondent", reps: respondentsReps }].map(({ label, reps }) => (
        <div key={label}>
          <h4 className={`font-medium text-sm mb-2 pl-3 border-l-4 ${label === "Claimant" ? "border-[#0F2547]" : "border-gray-400"}`}>{label} Representatives</h4>
          {reps.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-gray-200 rounded-xl text-sm text-gray-400">No {label.toLowerCase()} representatives added.</div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-2 px-4 text-xs text-gray-500 font-semibold uppercase tracking-wide">Name</th>
                    <th className="text-left py-2 px-4 text-xs text-gray-500 font-semibold uppercase tracking-wide">Firm</th>
                    <th className="text-left py-2 px-4 text-xs text-gray-500 font-semibold uppercase tracking-wide">Role</th>
                    <th className="text-left py-2 px-4 text-xs text-gray-500 font-semibold uppercase tracking-wide">Email</th>
                    <th className="print:hidden" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reps.map((r: Representative) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="py-2.5 px-4 font-medium text-[#0F2547]">{r.name}</td>
                      <td className="py-2.5 px-4 text-gray-600">{r.firm}</td>
                      <td className="py-2.5 px-4 text-xs">
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium">{r.role}</span>
                      </td>
                      <td className="py-2.5 px-4 text-gray-500 text-xs">{r.email}</td>
                      <td className="py-2.5 px-4 text-right print:hidden">
                        <button onClick={() => { if (!confirm(`Remove ${r.name}?`)) return; deleteMutation.mutate({ caseId, repId: r.id }); }} className="text-red-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── BUDGET ── */
function BudgetSection({ caseId }: { caseId: number }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: settings } = useGetCostsSettings(caseId);
  const [budget, setBudget] = useState("");
  const [budgetCurrency, setBudgetCurrency] = useState("USD");

  useEffect(() => {
    if (settings?.totalBudget) setBudget(settings.totalBudget);
    if (settings?.budgetCurrency) setBudgetCurrency(settings.budgetCurrency);
  }, [settings]);

  const upsertMutation = useUpsertCostsSettings();

  const handleSave = () => {
    upsertMutation.mutate(
      {
        caseId,
        data: {
          iccAdvanceAmount: settings?.iccAdvanceAmount ?? undefined,
          iccCurrency: settings?.iccCurrency ?? "USD",
          claimantPaid: settings?.claimantPaid ?? "0",
          respondentPaid: settings?.respondentPaid ?? "0",
          totalBudget: budget || undefined,
          budgetCurrency,
          notes: settings?.notes ?? undefined,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetCostsSettingsQueryKey(caseId) });
          toast({ title: "Budget saved" });
        },
        onError: () => toast({ title: "Save failed", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="max-w-md space-y-4">
      <div>
        <h3 className="font-semibold text-[#0F2547]">Legal Costs Budget</h3>
        <p className="text-sm text-gray-500 mt-0.5">Set an overall budget for legal costs. The Costs Tracker will show progress against this budget.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-600 mb-1 block">Total Budget</label>
          <input
            type="number"
            min="0"
            step="1000"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="Leave blank if no budget"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600 mb-1 block">Currency</label>
          <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={budgetCurrency} onChange={(e) => setBudgetCurrency(e.target.value)}>
            {["USD", "EUR", "GBP", "CHF", "SGD", "AED", "CAD", "AUD"].map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <button onClick={handleSave} disabled={upsertMutation.isPending} className="px-4 py-2 bg-[#0F2547] text-white text-sm rounded-lg hover:bg-[#1e3a6e] disabled:opacity-50">
        {upsertMutation.isPending ? "Saving…" : "Save Budget"}
      </button>
      <p className="text-xs text-gray-400">ICC advance payments and detailed cost breakdown are managed in the Costs tab.</p>
    </div>
  );
}

/* ── REMINDERS ── */
function RemindersSection({ caseId }: { caseId: number }) {
  const { toast } = useToast();

  const { data: prefs } = useQuery({
    queryKey: ["preferences", caseId],
    queryFn: () => fetch(`/api/cases/${caseId}/preferences`).then((r) => r.json()),
  });

  const [form, setForm] = useState({
    reminderDays: 7,
    emailNotifications: false,
    reminderEmail: "",
  });

  useEffect(() => {
    if (prefs) {
      setForm({
        reminderDays: prefs.reminderDays ?? 7,
        emailNotifications: prefs.emailNotifications ?? false,
        reminderEmail: prefs.reminderEmail ?? "",
      });
    }
  }, [prefs]);

  const saveMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/cases/${caseId}/preferences`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reminderDays: form.reminderDays,
          emailNotifications: form.emailNotifications,
          reminderEmail: form.reminderEmail || null,
        }),
      }).then((r) => r.json()),
    onSuccess: () => toast({ title: "Preferences saved" }),
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  return (
    <div className="max-w-md space-y-5">
      <div>
        <h3 className="font-semibold text-[#0F2547]">Deadline Reminders</h3>
        <p className="text-sm text-gray-500 mt-0.5">Configure how far in advance you receive deadline warnings.</p>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Remind me when a deadline is within</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={90}
            className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={form.reminderDays}
            onChange={(e) => setForm({ ...form, reminderDays: Number(e.target.value) })}
          />
          <span className="text-sm text-gray-600">days</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">Deadlines within this window will be highlighted in the Calendar view.</p>
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => setForm({ ...form, emailNotifications: !form.emailNotifications })}
            className={`w-10 h-5 rounded-full relative transition-colors ${form.emailNotifications ? "bg-[#0F2547]" : "bg-gray-300"}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.emailNotifications ? "translate-x-5" : "translate-x-0.5"}`} />
          </div>
          <span className="text-sm text-gray-700">Email notifications</span>
        </label>

        {form.emailNotifications && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Reminder email address</label>
            <input
              type="email"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.reminderEmail}
              onChange={(e) => setForm({ ...form, reminderEmail: e.target.value })}
              placeholder="you@lawfirm.com"
            />
            <p className="text-xs text-amber-600 mt-1">⚠ Email delivery requires server configuration. Preferences are saved for when this is enabled.</p>
          </motion.div>
        )}
      </div>

      <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="px-4 py-2 bg-[#0F2547] text-white text-sm rounded-lg hover:bg-[#1e3a6e] disabled:opacity-50">
        {saveMutation.isPending ? "Saving…" : "Save Preferences"}
      </button>
    </div>
  );
}
