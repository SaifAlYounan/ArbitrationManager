import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  LayoutDashboard,
  CalendarDays,
  FolderOpen,
  FileText,
  Mic2,
  DollarSign,
  Settings,
  Search,
  X,
  ChevronRight,
} from "lucide-react";
import {
  useGetCase,
  getGetCaseQueryKey,
} from "@workspace/api-client-react";
import { useImport } from "@/lib/import-context";

import ProceduralCalendar from "@/components/ProceduralCalendar";
import ProceduralOrders from "@/components/ProceduralOrders";
import HearingLogistics from "@/components/HearingLogistics";
import CostsTracker from "@/components/CostsTracker";
import CaseOverview from "@/components/CaseOverview";
import Exhibits from "@/components/Exhibits";
import CaseSettings from "@/components/CaseSettings";
import { useToast } from "@/hooks/use-toast";

type Section = "overview" | "calendar" | "exhibits" | "orders" | "hearing" | "costs" | "settings";

const NAV_ITEMS: { id: Section; label: string; shortLabel: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", shortLabel: "Overview", icon: LayoutDashboard },
  { id: "calendar", label: "Calendar", shortLabel: "Calendar", icon: CalendarDays },
  { id: "exhibits", label: "Exhibits", shortLabel: "Exhibits", icon: FolderOpen },
  { id: "orders", label: "Procedural Orders", shortLabel: "Orders", icon: FileText },
  { id: "hearing", label: "Hearing Logistics", shortLabel: "Hearing", icon: Mic2 },
  { id: "costs", label: "Costs Tracker", shortLabel: "Costs", icon: DollarSign },
  { id: "settings", label: "Settings", shortLabel: "Settings", icon: Settings },
];

const STATUS_DOT: Record<string, string> = {
  Active: "bg-green-400",
  Pending: "bg-amber-400",
  Closed: "bg-gray-400",
  Stayed: "bg-blue-400",
};

export default function CaseDashboard({ params }: { params: { id: string } }) {
  const caseId = parseInt(params.id, 10);
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [searchOpen, setSearchOpen] = useState(false);
  const qc = useQueryClient();
  const { setActiveCaseId, setActiveCaseName } = useImport();

  const { data: caseData, isLoading } = useGetCase(caseId);

  const invalidateCase = () => qc.invalidateQueries({ queryKey: getGetCaseQueryKey(caseId) });

  useEffect(() => {
    setActiveCaseId(caseId);
    return () => { setActiveCaseId(null); setActiveCaseName(null); };
  }, [caseId, setActiveCaseId, setActiveCaseName]);

  useEffect(() => {
    if (caseData?.caseName) setActiveCaseName(caseData.caseName);
  }, [caseData?.caseName, setActiveCaseName]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#0F2547] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!caseData) {
    return <div className="text-center py-20 text-gray-500">Case not found.</div>;
  }

  return (
    <div className="flex h-[calc(100vh-57px)]">
      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden md:flex w-52 flex-shrink-0 bg-[#0F2547] flex-col print:hidden overflow-y-auto">
        {/* Back + Case Info */}
        <div className="p-4 border-b border-white/10 flex-shrink-0">
          <Link href="/app" className="flex items-center gap-1.5 text-white/60 hover:text-white text-xs mb-3 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            All Cases
          </Link>
          <div className="font-mono text-[10px] text-blue-300 tracking-wider uppercase">{caseData.caseReference}</div>
          <div className="text-white font-semibold text-sm mt-1 leading-snug line-clamp-2">{caseData.caseName}</div>
          <div className="flex items-center gap-1.5 mt-2">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[caseData.status] ?? "bg-gray-400"}`} />
            <span className="text-xs text-blue-200">{caseData.status}</span>
          </div>
        </div>

        {/* Search Button */}
        <div className="px-3 py-2 border-b border-white/10 flex-shrink-0">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors text-xs"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search…</span>
            <span className="ml-auto font-mono opacity-60">⌘K</span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeSection === item.id
                  ? "bg-white/20 text-white shadow-sm"
                  : "text-white/65 hover:bg-white/10 hover:text-white"
              }`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
              {activeSection === item.id && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 flex-shrink-0">
          <p className="text-xs text-white/30 text-center">Procedural Manager</p>
        </div>
      </aside>

      {/* ── Mobile Top Nav ── */}
      <div className="md:hidden fixed top-14 left-0 right-0 z-10 bg-[#0F2547] print:hidden">
        <div className="flex items-center gap-1 px-3 py-2 overflow-x-auto scrollbar-hide border-b border-white/10">
          <Link href="/app" className="flex-shrink-0 text-white/60 hover:text-white mr-2">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeSection === item.id ? "bg-white text-[#0F2547]" : "text-white/70 hover:text-white"
              }`}
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.shortLabel}
            </button>
          ))}
          <button onClick={() => setSearchOpen(true)} className="flex-shrink-0 text-white/60 hover:text-white ml-auto pl-2">
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-auto bg-gray-50/50 md:mt-0 mt-14 print:bg-white">
        <div className="p-6 md:p-8 max-w-5xl print:p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {activeSection === "overview" && (
                <CaseOverview caseId={caseId} caseData={caseData as any} />
              )}
              {activeSection === "calendar" && <ProceduralCalendar caseId={caseId} />}
              {activeSection === "exhibits" && <Exhibits caseId={caseId} />}
              {activeSection === "orders" && <ProceduralOrders caseId={caseId} />}
              {activeSection === "hearing" && <HearingLogistics caseId={caseId} />}
              {activeSection === "costs" && (
                <CostsTracker caseId={caseId} caseRef={caseData.caseReference} />
              )}
              {activeSection === "settings" && (
                <CaseSettings
                  caseId={caseId}
                  caseData={caseData as any}
                  onInvalidate={invalidateCase}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ── Search Modal ── */}
      <AnimatePresence>
        {searchOpen && (
          <SearchModal
            caseId={caseId}
            onClose={() => setSearchOpen(false)}
            onNavigate={(section) => {
              setActiveSection(section);
              setSearchOpen(false);
            }}
          />
        )}
      </AnimatePresence>

    </div>
  );
}

/* ── Search Modal ── */
function SearchModal({
  caseId,
  onClose,
  onNavigate,
}: {
  caseId: number;
  onClose: () => void;
  onNavigate: (section: Section) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const { data: results, isFetching } = useQuery({
    queryKey: ["search", caseId, query],
    queryFn: () =>
      fetch(`/api/cases/${caseId}/search?q=${encodeURIComponent(query)}`).then((r) => r.json()),
    enabled: query.trim().length >= 2,
    staleTime: 2000,
  });

  const hasResults =
    results &&
    (results.deadlines?.length > 0 ||
      results.exhibits?.length > 0 ||
      results.orders?.length > 0 ||
      results.timeEntries?.length > 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center pt-[15vh] px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: -8 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96 }}
        transition={{ duration: 0.15 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search deadlines, exhibits, orders, time entries…"
            className="flex-1 text-sm outline-none text-gray-800 placeholder:text-gray-400"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
          <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600 ml-1 px-2 py-1 rounded bg-gray-100">
            Esc
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {query.length < 2 ? (
            <div className="p-6 text-center text-gray-400 text-sm">Type at least 2 characters to search</div>
          ) : isFetching ? (
            <div className="p-6 text-center text-gray-400 text-sm">Searching…</div>
          ) : !hasResults ? (
            <div className="p-6 text-center text-gray-400 text-sm">No results for "{query}"</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {results.deadlines?.length > 0 && (
                <SearchGroup
                  label="Deadlines"
                  items={results.deadlines.map((d: any) => ({ id: d.id, title: d.description, sub: d.dueDate, section: "calendar" as Section }))}
                  onNavigate={onNavigate}
                />
              )}
              {results.exhibits?.length > 0 && (
                <SearchGroup
                  label="Exhibits"
                  items={results.exhibits.map((e: any) => ({ id: e.id, title: `${e.exhibitNumber} — ${e.description}`, sub: `${e.party} · ${e.status}`, section: "exhibits" as Section }))}
                  onNavigate={onNavigate}
                />
              )}
              {results.orders?.length > 0 && (
                <SearchGroup
                  label="Procedural Orders"
                  items={results.orders.map((o: any) => ({ id: o.id, title: `${o.poNumber}: ${o.summary}`, sub: o.isFinalized ? "Finalized" : "Draft", section: "orders" as Section }))}
                  onNavigate={onNavigate}
                />
              )}
              {results.timeEntries?.length > 0 && (
                <SearchGroup
                  label="Time Entries"
                  items={results.timeEntries.map((t: any) => ({ id: t.id, title: t.description, sub: `${t.memberName} · ${t.phase}`, section: "costs" as Section }))}
                  onNavigate={onNavigate}
                />
              )}
            </div>
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 flex gap-4 text-xs text-gray-400">
          <span>↑↓ navigate</span>
          <span>↵ open section</span>
          <span>Esc close</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SearchGroup({
  label,
  items,
  onNavigate,
}: {
  label: string;
  items: { id: number; title: string; sub?: string; section: Section }[];
  onNavigate: (section: Section) => void;
}) {
  return (
    <div className="p-2">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 py-1.5">{label}</div>
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.section)}
          className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-[#0F2547]/5 text-left transition-colors group"
        >
          <div className="flex-1 min-w-0">
            <div className="text-sm text-gray-800 group-hover:text-[#0F2547] font-medium truncate">{item.title}</div>
            {item.sub && <div className="text-xs text-gray-400 mt-0.5">{item.sub}</div>}
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#0F2547] flex-shrink-0 mt-0.5" />
        </button>
      ))}
    </div>
  );
}
