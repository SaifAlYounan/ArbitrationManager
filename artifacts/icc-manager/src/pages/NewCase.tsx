import { useLocation } from "wouter";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useCreateCase, 
  getListCasesQueryKey,
  ApplicableRules,
  CaseStatus,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function NewCase() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMutation = useCreateCase({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListCasesQueryKey() });
        toast({
          title: "Case Created Successfully",
          description: `Case ${data.caseReference} has been initialized.`,
        });
        setLocation(`/cases/${data.id}`);
      },
      onError: (error) => {
        toast({
          title: "Failed to create case",
          description: error.message || "Please check your inputs and try again.",
          variant: "destructive",
        });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    
    createMutation.mutate({
      data: {
        caseReference: fd.get("caseReference") as string,
        caseName: fd.get("caseName") as string,
        claimants: fd.get("claimants") as string,
        respondents: fd.get("respondents") as string,
        seatOfArbitration: fd.get("seatOfArbitration") as string,
        languageOfArbitration: fd.get("languageOfArbitration") as string,
        applicableRules: fd.get("applicableRules") as ApplicableRules,
        dateOfRequest: fd.get("dateOfRequest") as string,
        currency: fd.get("currency") as string,
        status: CaseStatus.Active, // Default for new cases
      }
    });
  };

  const inputClass = "flex h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 shadow-sm";
  const labelClass = "text-sm font-semibold text-foreground mb-1.5 block";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Instigate New Case</h1>
          <p className="text-muted-foreground mt-1">Enter the preliminary procedural details for the new arbitration.</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Case Reference *</label>
              <input 
                name="caseReference" 
                required 
                placeholder="e.g. ICC Case No. 27841/ABC" 
                className={inputClass} 
              />
            </div>
            <div>
              <label className={labelClass}>Case Name *</label>
              <input 
                name="caseName" 
                required 
                placeholder="e.g. Alpha Corp v. Beta Ltd" 
                className={inputClass} 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Claimant(s) *</label>
              <textarea 
                name="claimants" 
                required 
                rows={3}
                placeholder="List claimants, separated by commas" 
                className={cn(inputClass, "min-h-[80px] py-3")} 
              />
            </div>
            <div>
              <label className={labelClass}>Respondent(s) *</label>
              <textarea 
                name="respondents" 
                required 
                rows={3}
                placeholder="List respondents, separated by commas" 
                className={cn(inputClass, "min-h-[80px] py-3")} 
              />
            </div>
          </div>

          <hr className="border-border" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Seat of Arbitration *</label>
              <input 
                name="seatOfArbitration" 
                required 
                placeholder="e.g. Paris, France" 
                className={inputClass} 
              />
            </div>
            <div>
              <label className={labelClass}>Language of Arbitration *</label>
              <input 
                name="languageOfArbitration" 
                required 
                placeholder="e.g. English" 
                className={inputClass} 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className={labelClass}>Applicable Rules *</label>
              <select name="applicableRules" required className={inputClass}>
                {Object.values(ApplicableRules).map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Date of Request *</label>
              <input 
                type="date" 
                name="dateOfRequest" 
                required 
                className={inputClass} 
              />
            </div>
            <div>
              <label className={labelClass}>Currency for Costs *</label>
              <input 
                name="currency" 
                required 
                placeholder="e.g. USD, EUR, GBP" 
                className={inputClass} 
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 pt-4 border-t border-border">
            <Link href="/" className="px-6 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </Link>
            <button 
              type="submit" 
              disabled={createMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-2.5 text-sm font-medium text-primary-foreground shadow-lg hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Instigate Case
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

// Utility duplicate locally for NewCase
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
