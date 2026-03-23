import { Link } from "wouter";
import { Plus, Users, Search, AlertCircle } from "lucide-react";
import { useListCases } from "@workspace/api-client-react";
import { StatusBadge } from "@/components/StatusBadge";
import { motion } from "framer-motion";

export default function Home() {
  const { data: cases, isLoading, isError } = useListCases();

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground">Active Proceedings</h1>
          <p className="mt-2 text-muted-foreground">Manage your international ICC arbitration cases.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search references..." 
              className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
            />
          </div>
          <Link 
            href="/cases/new" 
            className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg hover:bg-primary/90 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="h-4 w-4" />
            New Case
          </Link>
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 rounded-xl bg-card border border-border animate-pulse shadow-sm"></div>
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 flex items-center gap-3 text-destructive">
          <AlertCircle className="h-6 w-6" />
          <div>
            <h3 className="font-semibold">Failed to load cases</h3>
            <p className="text-sm opacity-90">Please try refreshing the page or check your connection.</p>
          </div>
        </div>
      )}

      {!isLoading && !isError && cases?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-border bg-card/50">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
            <Users className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-display font-semibold text-foreground">No cases found</h2>
          <p className="mt-1 text-muted-foreground max-w-sm">Get started by instigating a new arbitration proceeding to manage your tribunal and representatives.</p>
          <Link 
            href="/cases/new" 
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-md hover:bg-primary/90 transition-all"
          >
            <Plus className="h-4 w-4" />
            Open New Case
          </Link>
        </div>
      )}

      {!isLoading && !isError && cases && cases.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cases.map((caseItem, i) => (
            <motion.div
              key={caseItem.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Link href={`/cases/${caseItem.id}`} className="group block h-full">
                <div className="relative flex h-full flex-col justify-between rounded-xl bg-card p-6 shadow-sm border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-xl" />
                  
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider bg-secondary px-2.5 py-1 rounded-md">
                        {caseItem.caseReference}
                      </span>
                      <StatusBadge status={caseItem.status} />
                    </div>
                    
                    <h3 className="font-display text-xl font-bold text-foreground mb-3 leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {caseItem.caseName}
                    </h3>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border/60">
                    <div className="space-y-2 text-sm">
                      <div className="flex gap-2">
                        <span className="text-muted-foreground w-20 font-medium">Claimant:</span>
                        <span className="text-foreground truncate font-semibold" title={caseItem.claimants}>{caseItem.claimants}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-muted-foreground w-20 font-medium">Respondent:</span>
                        <span className="text-foreground truncate font-semibold" title={caseItem.respondents}>{caseItem.respondents}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
