import { useState } from "react";
import { Link } from "wouter";
import { 
  ArrowLeft, Edit3, Plus, Trash2, MapPin, Globe, 
  Calendar, DollarSign, Book, Scale, Building2, UserCircle 
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { cn, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

import {
  useGetCase,
  useUpdateCase,
  useAddTribunalMember,
  useDeleteTribunalMember,
  useAddRepresentative,
  useDeleteRepresentative,
  getGetCaseQueryKey,
  ApplicableRules,
  CaseStatus,
  TribunalRole,
  RepresentativeRole,
  RepresentativeParty,
} from "@workspace/api-client-react";
import type { TribunalMember, Representative } from "@workspace/api-client-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// --- Subcomponents for Forms ---
function EditCaseModal({ caseData, isOpen, onClose, onSave, isPending }: any) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-card border-border shadow-2xl p-0 gap-0">
        <DialogHeader className="p-6 border-b border-border bg-muted/30">
          <DialogTitle className="font-display text-xl text-foreground">Edit Case Details</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          onSave({
            caseReference: fd.get("caseReference"),
            caseName: fd.get("caseName"),
            claimants: fd.get("claimants"),
            respondents: fd.get("respondents"),
            seatOfArbitration: fd.get("seatOfArbitration"),
            languageOfArbitration: fd.get("languageOfArbitration"),
            applicableRules: fd.get("applicableRules"),
            dateOfRequest: fd.get("dateOfRequest"),
            currency: fd.get("currency"),
            status: fd.get("status"),
          });
        }} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold mb-1 block text-foreground">Status</label>
              <select name="status" defaultValue={caseData.status} className="w-full rounded-md border border-border h-10 px-3 bg-background">
                {Object.values(CaseStatus).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block text-foreground">Rules</label>
              <select name="applicableRules" defaultValue={caseData.applicableRules} className="w-full rounded-md border border-border h-10 px-3 bg-background">
                {Object.values(ApplicableRules).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block text-foreground">Case Reference</label>
              <input name="caseReference" defaultValue={caseData.caseReference} required className="w-full rounded-md border border-border h-10 px-3 bg-background" />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block text-foreground">Case Name</label>
              <input name="caseName" defaultValue={caseData.caseName} required className="w-full rounded-md border border-border h-10 px-3 bg-background" />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-semibold mb-1 block text-foreground">Claimants</label>
              <textarea name="claimants" defaultValue={caseData.claimants} required rows={2} className="w-full rounded-md border border-border p-3 bg-background" />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-semibold mb-1 block text-foreground">Respondents</label>
              <textarea name="respondents" defaultValue={caseData.respondents} required rows={2} className="w-full rounded-md border border-border p-3 bg-background" />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block text-foreground">Seat</label>
              <input name="seatOfArbitration" defaultValue={caseData.seatOfArbitration} required className="w-full rounded-md border border-border h-10 px-3 bg-background" />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block text-foreground">Language</label>
              <input name="languageOfArbitration" defaultValue={caseData.languageOfArbitration} required className="w-full rounded-md border border-border h-10 px-3 bg-background" />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block text-foreground">Date</label>
              <input type="date" name="dateOfRequest" defaultValue={caseData.dateOfRequest} required className="w-full rounded-md border border-border h-10 px-3 bg-background" />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block text-foreground">Currency</label>
              <input name="currency" defaultValue={caseData.currency} required className="w-full rounded-md border border-border h-10 px-3 bg-background" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <button type="button" onClick={() => onClose(false)} className="px-4 py-2 font-medium text-muted-foreground hover:text-foreground">Cancel</button>
            <button type="submit" disabled={isPending} className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 shadow-sm">
              Save Changes
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddTribunalModal({ isOpen, onClose, onSave, isPending }: any) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-border shadow-2xl p-0 gap-0">
        <DialogHeader className="p-6 border-b border-border bg-muted/30">
          <DialogTitle className="font-display text-xl text-foreground">Add Tribunal Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          onSave({
            name: fd.get("name"),
            role: fd.get("role"),
            email: fd.get("email"),
            timeZone: fd.get("timeZone"),
          });
        }} className="p-6 space-y-4">
          <div>
            <label className="text-sm font-semibold mb-1 block text-foreground">Full Name</label>
            <input name="name" required className="w-full rounded-md border border-border h-10 px-3 bg-background" />
          </div>
          <div>
            <label className="text-sm font-semibold mb-1 block text-foreground">Role</label>
            <select name="role" required className="w-full rounded-md border border-border h-10 px-3 bg-background">
              {Object.values(TribunalRole).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold mb-1 block text-foreground">Email</label>
            <input type="email" name="email" required className="w-full rounded-md border border-border h-10 px-3 bg-background" />
          </div>
          <div>
            <label className="text-sm font-semibold mb-1 block text-foreground">Time Zone</label>
            <input name="timeZone" placeholder="e.g. CET, EST" required className="w-full rounded-md border border-border h-10 px-3 bg-background" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <button type="button" onClick={() => onClose(false)} className="px-4 py-2 font-medium text-muted-foreground">Cancel</button>
            <button type="submit" disabled={isPending} className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50">
              Add Member
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddRepModal({ isOpen, onClose, onSave, isPending }: any) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-border shadow-2xl p-0 gap-0">
        <DialogHeader className="p-6 border-b border-border bg-muted/30">
          <DialogTitle className="font-display text-xl text-foreground">Add Representative</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          onSave({
            name: fd.get("name"),
            firm: fd.get("firm"),
            party: fd.get("party"),
            role: fd.get("role"),
            email: fd.get("email"),
            timeZone: fd.get("timeZone"),
          });
        }} className="p-6 space-y-4">
          <div>
            <label className="text-sm font-semibold mb-1 block text-foreground">Full Name</label>
            <input name="name" required className="w-full rounded-md border border-border h-10 px-3 bg-background" />
          </div>
          <div>
            <label className="text-sm font-semibold mb-1 block text-foreground">Law Firm</label>
            <input name="firm" required className="w-full rounded-md border border-border h-10 px-3 bg-background" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold mb-1 block text-foreground">Party</label>
              <select name="party" required className="w-full rounded-md border border-border h-10 px-3 bg-background">
                {Object.values(RepresentativeParty).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block text-foreground">Role</label>
              <select name="role" required className="w-full rounded-md border border-border h-10 px-3 bg-background">
                {Object.values(RepresentativeRole).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold mb-1 block text-foreground">Email</label>
            <input type="email" name="email" required className="w-full rounded-md border border-border h-10 px-3 bg-background" />
          </div>
          <div>
            <label className="text-sm font-semibold mb-1 block text-foreground">Time Zone</label>
            <input name="timeZone" placeholder="e.g. CET, EST" required className="w-full rounded-md border border-border h-10 px-3 bg-background" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <button type="button" onClick={() => onClose(false)} className="px-4 py-2 font-medium text-muted-foreground">Cancel</button>
            <button type="submit" disabled={isPending} className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50">
              Add Rep
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}


// --- Main Component ---
export default function CaseDashboard({ params }: { params: { id: string } }) {
  const caseId = parseInt(params.id, 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"details" | "tribunal" | "reps">("details");
  
  // Modals state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isTribunalOpen, setIsTribunalOpen] = useState(false);
  const [isRepOpen, setIsRepOpen] = useState(false);

  const { data: caseData, isLoading } = useGetCase(caseId);

  const invalidateCase = () => queryClient.invalidateQueries({ queryKey: getGetCaseQueryKey(caseId) });

  const updateCase = useUpdateCase({
    mutation: {
      onSuccess: () => { invalidateCase(); setIsEditOpen(false); toast({ title: "Case updated" }); },
      onError: (e) => toast({ title: "Error updating case", description: e.message, variant: "destructive" })
    }
  });

  const addTribunal = useAddTribunalMember({
    mutation: {
      onSuccess: () => { invalidateCase(); setIsTribunalOpen(false); toast({ title: "Member added" }); },
      onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" })
    }
  });

  const deleteTribunal = useDeleteTribunalMember({
    mutation: {
      onSuccess: () => { invalidateCase(); toast({ title: "Member removed" }); },
      onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" })
    }
  });

  const addRep = useAddRepresentative({
    mutation: {
      onSuccess: () => { invalidateCase(); setIsRepOpen(false); toast({ title: "Representative added" }); },
      onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" })
    }
  });

  const deleteRep = useDeleteRepresentative({
    mutation: {
      onSuccess: () => { invalidateCase(); toast({ title: "Representative removed" }); },
      onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" })
    }
  });


  if (isLoading) {
    return (
      <div className="flex flex-col space-y-6 animate-pulse">
        <div className="h-32 bg-card rounded-2xl"></div>
        <div className="h-[500px] bg-card rounded-2xl"></div>
      </div>
    );
  }

  if (!caseData) return <div className="text-center py-20 text-muted-foreground">Case not found.</div>;

  const claimantsReps = caseData.representatives.filter(r => r.party === RepresentativeParty.Claimant);
  const respondentsReps = caseData.representatives.filter(r => r.party === RepresentativeParty.Respondent);

  const tabs = [
    { id: "details", label: "Case Details" },
    { id: "tribunal", label: `Tribunal (${caseData.tribunalMembers.length})` },
    { id: "reps", label: `Representatives (${caseData.representatives.length})` },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <span className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
          Back to list
        </span>
      </div>

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-primary text-primary-foreground shadow-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 text-primary-foreground/5">
          <Scale className="w-64 h-64" strokeWidth={1} />
        </div>
        <div className="relative z-10 p-8 sm:p-10">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
            <div className="inline-flex px-3 py-1 rounded-md bg-primary-foreground/10 border border-primary-foreground/20 text-sm font-mono font-medium">
              {caseData.caseReference}
            </div>
            <StatusBadge status={caseData.status} className="bg-primary-foreground text-primary border-transparent shadow-md px-4 py-1.5 text-sm" />
          </div>
          <h1 className="text-3xl sm:text-5xl font-display font-bold max-w-3xl leading-tight">
            {caseData.caseName}
          </h1>
          <div className="mt-8 flex flex-wrap gap-6 text-sm text-primary-foreground/80 font-medium">
            <span className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {caseData.seatOfArbitration}</span>
            <span className="flex items-center gap-2"><Globe className="w-4 h-4" /> {caseData.languageOfArbitration}</span>
            <span className="flex items-center gap-2"><Book className="w-4 h-4" /> {caseData.applicableRules}</span>
          </div>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="bg-card rounded-2xl shadow-sm border border-border">
        <div className="flex space-x-8 px-8 border-b border-border overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative py-5 text-sm font-semibold transition-colors whitespace-nowrap",
                activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTab" 
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" 
                />
              )}
            </button>
          ))}
        </div>

        <div className="p-8">
          {/* Details Tab */}
          {activeTab === "details" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-display font-bold text-foreground">Procedural Overview</h3>
                <button onClick={() => setIsEditOpen(true)} className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:bg-primary/5 px-4 py-2 rounded-lg transition-colors border border-primary/20">
                  <Edit3 className="w-4 h-4" /> Edit Details
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                      <UserCircle className="w-4 h-4" /> Claimants
                    </h4>
                    <p className="text-foreground whitespace-pre-wrap leading-relaxed">{caseData.claimants}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                      <UserCircle className="w-4 h-4" /> Respondents
                    </h4>
                    <p className="text-foreground whitespace-pre-wrap leading-relaxed">{caseData.respondents}</p>
                  </div>
                </div>

                <div className="bg-muted/30 rounded-xl p-6 border border-border/50 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Date of Request</h4>
                      <p className="font-semibold flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /> {formatDate(caseData.dateOfRequest)}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Currency</h4>
                      <p className="font-semibold flex items-center gap-2"><DollarSign className="w-4 h-4 text-muted-foreground" /> {caseData.currency}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Seat</h4>
                      <p className="font-semibold">{caseData.seatOfArbitration}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Language</h4>
                      <p className="font-semibold">{caseData.languageOfArbitration}</p>
                    </div>
                    <div className="col-span-2 pt-4 border-t border-border/50">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Applicable Rules</h4>
                      <p className="font-semibold text-primary">{caseData.applicableRules}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Tribunal Tab */}
          {activeTab === "tribunal" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-display font-bold text-foreground">Arbitral Tribunal</h3>
                  <p className="text-sm text-muted-foreground mt-1">Manage the appointed arbitrators for this case.</p>
                </div>
                <button onClick={() => setIsTribunalOpen(true)} className="inline-flex items-center gap-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg transition-all shadow-sm">
                  <Plus className="w-4 h-4" /> Add Member
                </button>
              </div>

              {caseData.tribunalMembers.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-border rounded-xl bg-muted/20">
                  <Scale className="w-10 h-10 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground font-medium">No tribunal members appointed yet.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted text-muted-foreground uppercase tracking-wider text-xs font-bold">
                      <tr>
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">Contact</th>
                        <th className="px-6 py-4">Time Zone</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                      {caseData.tribunalMembers.map((m: TribunalMember) => (
                        <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4 font-semibold text-foreground">{m.name}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                              {m.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">{m.email}</td>
                          <td className="px-6 py-4 text-muted-foreground">{m.timeZone}</td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => deleteTribunal.mutate({ caseId, memberId: m.id })}
                              className="text-destructive hover:bg-destructive/10 p-2 rounded-md transition-colors"
                              title="Remove"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {/* Representatives Tab */}
          {activeTab === "reps" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-display font-bold text-foreground">Party Representatives</h3>
                  <p className="text-sm text-muted-foreground mt-1">Manage external counsel representing both parties.</p>
                </div>
                <button onClick={() => setIsRepOpen(true)} className="inline-flex items-center gap-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg transition-all shadow-sm">
                  <Plus className="w-4 h-4" /> Add Representative
                </button>
              </div>

              <div className="space-y-8">
                {/* Claimants Table */}
                <div>
                  <h4 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2 border-l-4 border-primary pl-3">
                    Claimant Representatives
                  </h4>
                  {claimantsReps.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-border rounded-xl bg-muted/10 text-sm text-muted-foreground">No claimant representatives added.</div>
                  ) : (
                    <RepTable reps={claimantsReps} onDelete={(repId) => deleteRep.mutate({ caseId, repId })} />
                  )}
                </div>

                {/* Respondents Table */}
                <div>
                  <h4 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2 border-l-4 border-slate-400 pl-3">
                    Respondent Representatives
                  </h4>
                  {respondentsReps.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-border rounded-xl bg-muted/10 text-sm text-muted-foreground">No respondent representatives added.</div>
                  ) : (
                    <RepTable reps={respondentsReps} onDelete={(repId) => deleteRep.mutate({ caseId, repId })} />
                  )}
                </div>
              </div>

            </motion.div>
          )}

        </div>
      </div>

      {/* Modals */}
      <EditCaseModal 
        isOpen={isEditOpen} 
        onClose={setIsEditOpen} 
        caseData={caseData} 
        onSave={(data: any) => updateCase.mutate({ id: caseId, data })}
        isPending={updateCase.isPending}
      />
      <AddTribunalModal 
        isOpen={isTribunalOpen} 
        onClose={setIsTribunalOpen} 
        onSave={(data: any) => addTribunal.mutate({ caseId, data })}
        isPending={addTribunal.isPending}
      />
      <AddRepModal 
        isOpen={isRepOpen} 
        onClose={setIsRepOpen} 
        onSave={(data: any) => addRep.mutate({ caseId, data })}
        isPending={addRep.isPending}
      />

    </div>
  );
}

function RepTable({ reps, onDelete }: { reps: Representative[], onDelete: (id: number) => void }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider text-xs font-bold">
          <tr>
            <th className="px-6 py-3">Name / Firm</th>
            <th className="px-6 py-3">Role</th>
            <th className="px-6 py-3">Contact</th>
            <th className="px-6 py-3">Time Zone</th>
            <th className="px-6 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {reps.map((r) => (
            <tr key={r.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-6 py-3">
                <div className="font-semibold text-foreground">{r.name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Building2 className="w-3 h-3"/> {r.firm}</div>
              </td>
              <td className="px-6 py-3 font-medium text-slate-600">{r.role}</td>
              <td className="px-6 py-3 text-muted-foreground">{r.email}</td>
              <td className="px-6 py-3 text-muted-foreground">{r.timeZone}</td>
              <td className="px-6 py-3 text-right">
                <button 
                  onClick={() => onDelete(r.id)}
                  className="text-destructive hover:bg-destructive/10 p-2 rounded-md transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
