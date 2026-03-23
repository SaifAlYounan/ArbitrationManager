import { useState } from "react";
import { motion } from "framer-motion";
import {
  useListExhibits,
  useAddExhibit,
  useUpdateExhibit,
  useDeleteExhibit,
  getListExhibitsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";

interface Exhibit {
  id: number;
  caseId: number;
  exhibitNumber: string;
  party: string;
  description: string;
  date: string;
  docRef: string | null;
  status: string;
  createdAt: string;
}

const STATUSES = ["Filed", "Pending", "Agreed", "Disputed"] as const;
const PARTIES = ["Claimant", "Respondent"] as const;

const STATUS_COLORS: Record<string, string> = {
  Filed: "bg-blue-50 text-blue-700",
  Pending: "bg-amber-50 text-amber-700",
  Agreed: "bg-green-50 text-green-700",
  Disputed: "bg-red-50 text-red-700",
};

interface Props {
  caseId: number;
}

export default function Exhibits({ caseId }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: exhibits = [], isLoading } = useListExhibits(caseId);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Exhibit | null>(null);
  const [filterParty, setFilterParty] = useState<"All" | "Claimant" | "Respondent">("All");
  const [filterStatus, setFilterStatus] = useState("All");

  const blank = {
    exhibitNumber: "",
    party: "Claimant" as const,
    description: "",
    date: "",
    docRef: "",
    status: "Filed" as const,
  };
  const [form, setForm] = useState(blank);

  const addMutation = useAddExhibit();
  const updateMutation = useUpdateExhibit();
  const deleteMutation = useDeleteExhibit();

  const invalidate = () => qc.invalidateQueries({ queryKey: getListExhibitsQueryKey(caseId) });

  const resetForm = () => {
    setForm(blank);
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (e: Exhibit) => {
    setEditing(e);
    setForm({
      exhibitNumber: e.exhibitNumber,
      party: e.party as "Claimant" | "Respondent",
      description: e.description,
      date: e.date,
      docRef: e.docRef ?? "",
      status: e.status as "Filed" | "Pending" | "Agreed" | "Disputed",
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.description || !form.date) {
      toast({ title: "Description and date are required", variant: "destructive" });
      return;
    }
    const data = {
      exhibitNumber: form.exhibitNumber || undefined,
      party: form.party,
      description: form.description,
      date: form.date,
      docRef: form.docRef || undefined,
      status: form.status,
    };
    if (editing) {
      updateMutation.mutate(
        { caseId, exhibitId: editing.id, data: { ...data, exhibitNumber: form.exhibitNumber || editing.exhibitNumber } },
        {
          onSuccess: () => { invalidate(); resetForm(); toast({ title: "Exhibit updated" }); },
          onError: () => toast({ title: "Update failed", variant: "destructive" }),
        }
      );
    } else {
      addMutation.mutate(
        { caseId, data },
        {
          onSuccess: () => { invalidate(); resetForm(); toast({ title: "Exhibit registered" }); },
          onError: () => toast({ title: "Registration failed", variant: "destructive" }),
        }
      );
    }
  };

  const filtered = exhibits
    .filter((e: Exhibit) => filterParty === "All" || e.party === filterParty)
    .filter((e: Exhibit) => filterStatus === "All" || e.status === filterStatus);

  const claimantCount = exhibits.filter((e: Exhibit) => e.party === "Claimant").length;
  const respondentCount = exhibits.filter((e: Exhibit) => e.party === "Respondent").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold text-[#0F2547]">Exhibits Register</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {exhibits.length} total · {claimantCount} claimant (C-) · {respondentCount} respondent (R-)
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setForm(blank); setShowForm(true); }}
          className="px-3 py-1.5 text-sm bg-[#0F2547] text-white rounded-md hover:bg-[#1e3a6e]"
        >
          + Register Exhibit
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select
          className="border border-gray-300 rounded px-2 py-1.5 text-sm"
          value={filterParty}
          onChange={(e) => setFilterParty(e.target.value as any)}
        >
          <option value="All">All Parties</option>
          <option value="Claimant">Claimant</option>
          <option value="Respondent">Respondent</option>
        </select>
        <select
          className="border border-gray-300 rounded px-2 py-1.5 text-sm"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="All">All Statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        {(filterParty !== "All" || filterStatus !== "All") && (
          <button onClick={() => { setFilterParty("All"); setFilterStatus("All"); }} className="text-xs text-gray-500 hover:underline">
            Clear filters
          </button>
        )}
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3"
        >
          <h3 className="font-semibold text-[#0F2547]">{editing ? "Edit Exhibit" : "Register Exhibit"}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Party *</label>
              <select
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                value={form.party}
                onChange={(e) => setForm({ ...form, party: e.target.value as "Claimant" | "Respondent" })}
              >
                {PARTIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">
                Exhibit Number {editing ? "" : "(leave blank to auto-generate)"}
              </label>
              <input
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                value={form.exhibitNumber}
                onChange={(e) => setForm({ ...form, exhibitNumber: e.target.value })}
                placeholder={form.party === "Claimant" ? "e.g. C-001" : "e.g. R-001"}
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Date Filed *</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Status</label>
              <select
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as any })}
              >
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-600 mb-1 block">Description *</label>
              <input
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="E.g. Contract dated 1 Jan 2024 between Alpha Corp and Omega Industries"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Document Reference</label>
              <input
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                value={form.docRef}
                onChange={(e) => setForm({ ...form, docRef: e.target.value })}
                placeholder="e.g. File ID, Relativity ID"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSubmit}
              disabled={addMutation.isPending || updateMutation.isPending}
              className="px-3 py-1.5 text-sm bg-[#0F2547] text-white rounded-md hover:bg-[#1e3a6e] disabled:opacity-50"
            >
              {editing ? "Save Changes" : "Register Exhibit"}
            </button>
            <button onClick={resetForm} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm print:text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-2.5 px-4 text-xs text-gray-500 font-semibold uppercase tracking-wide">No.</th>
              <th className="text-left py-2.5 px-4 text-xs text-gray-500 font-semibold uppercase tracking-wide">Party</th>
              <th className="text-left py-2.5 px-4 text-xs text-gray-500 font-semibold uppercase tracking-wide">Description</th>
              <th className="text-left py-2.5 px-4 text-xs text-gray-500 font-semibold uppercase tracking-wide">Date Filed</th>
              <th className="text-left py-2.5 px-4 text-xs text-gray-500 font-semibold uppercase tracking-wide">Doc Ref</th>
              <th className="text-left py-2.5 px-4 text-xs text-gray-500 font-semibold uppercase tracking-wide">Status</th>
              <th className="print:hidden" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={7} className="py-8 text-center text-gray-400">Loading exhibits…</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center">
                  <div className="text-gray-400 text-sm">No exhibits registered yet.</div>
                  <div className="text-gray-300 text-xs mt-1">Click "+ Register Exhibit" to add the first exhibit.</div>
                </td>
              </tr>
            ) : (
              filtered.map((e: Exhibit) => (
                <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-mono font-semibold text-[#0F2547]">{e.exhibitNumber}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${e.party === "Claimant" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                      {e.party}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-700 max-w-xs">{e.description}</td>
                  <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{formatDate(e.date)}</td>
                  <td className="py-3 px-4 text-gray-500 text-xs">{e.docRef ?? "—"}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[e.status]}`}>{e.status}</span>
                  </td>
                  <td className="py-3 px-4 print:hidden">
                    <div className="flex gap-3 justify-end">
                      <button onClick={() => handleEdit(e)} className="text-xs text-[#0F2547] hover:underline">Edit</button>
                      <button
                        onClick={() => {
                          if (!confirm(`Delete exhibit ${e.exhibitNumber}?`)) return;
                          deleteMutation.mutate(
                            { caseId, exhibitId: e.id },
                            { onSuccess: () => { invalidate(); toast({ title: "Exhibit deleted" }); } }
                          );
                        }}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-gray-400 text-right">{filtered.length} exhibit{filtered.length !== 1 ? "s" : ""} shown</p>
      )}
    </div>
  );
}
