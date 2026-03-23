import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  useListDeadlines,
  useListExhibits,
  useListProceduralOrders,
  useListTimeEntries,
  useListRateCard,
  useListDisbursements,
} from "@workspace/api-client-react";
import { formatDate } from "@/lib/utils";

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
  tribunalMembers: any[];
  representatives: any[];
}

interface Props {
  caseId: number;
  caseData: CaseData;
}

const ACTIVITY_ICONS: Record<string, string> = {
  deadline: "📅",
  exhibit: "📁",
  po: "📋",
  time: "⏱",
  disbursement: "💰",
  hearing: "🎙",
};

const STATUS_COLORS: Record<string, string> = {
  Active: "bg-green-100 text-green-800",
  Pending: "bg-amber-100 text-amber-800",
  Closed: "bg-gray-100 text-gray-600",
  Stayed: "bg-blue-100 text-blue-700",
};

function num(s: string | null | undefined) {
  return parseFloat(s ?? "0") || 0;
}

function fmt(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

export default function CaseOverview({ caseId, caseData }: Props) {
  const { data: deadlines = [] } = useListDeadlines(caseId);
  const { data: exhibits = [] } = useListExhibits(caseId);
  const { data: orders = [] } = useListProceduralOrders(caseId);
  const { data: timeEntries = [] } = useListTimeEntries(caseId);
  const { data: rateCard = [] } = useListRateCard(caseId);
  const { data: disbursements = [] } = useListDisbursements(caseId);

  const { data: activity = [] } = useQuery<any[]>({
    queryKey: ["activity", caseId],
    queryFn: () => fetch(`/api/cases/${caseId}/activity`).then((r) => r.json()),
  });

  const today = useMemo(() => new Date(), []);
  const todayStr = today.toISOString().split("T")[0];

  const pendingDeadlines = useMemo(
    () => deadlines.filter((d: any) => d.status !== "Completed"),
    [deadlines]
  );

  const upcomingDeadlines = useMemo(() => {
    return pendingDeadlines
      .map((d: any) => {
        const due = new Date(d.dueDate + "T00:00:00");
        const daysUntil = Math.ceil((due.getTime() - today.getTime()) / 86400000);
        return { ...d, daysUntil };
      })
      .filter((d: any) => d.daysUntil >= 0)
      .sort((a: any, b: any) => a.daysUntil - b.daysUntil)
      .slice(0, 5);
  }, [pendingDeadlines, today]);

  const overdueDeadlines = useMemo(() => {
    return pendingDeadlines
      .map((d: any) => {
        const due = new Date(d.dueDate + "T00:00:00");
        const daysUntil = Math.ceil((due.getTime() - today.getTime()) / 86400000);
        return { ...d, daysUntil };
      })
      .filter((d: any) => d.daysUntil < 0)
      .sort((a: any, b: any) => a.daysUntil - b.daysUntil);
  }, [pendingDeadlines, today]);

  const rateMap = useMemo(() => new Map(rateCard.map((m: any) => [m.id, m])), [rateCard]);

  const totalHours = useMemo(
    () => timeEntries.reduce((s: number, e: any) => s + num(e.hours), 0),
    [timeEntries]
  );

  const totalCosts = useMemo(() => {
    const timeCost = timeEntries.reduce((s: number, e: any) => {
      const m = e.rateCardId ? rateMap.get(e.rateCardId) : null;
      return s + (m ? num(e.hours) * num(m.hourlyRate) : 0);
    }, 0);
    const disbCost = disbursements.reduce((s: number, d: any) => s + num(d.amount), 0);
    return timeCost + disbCost;
  }, [timeEntries, rateMap, disbursements]);

  const daysSinceRA = useMemo(() => {
    if (!caseData.dateOfRequest) return null;
    const ra = new Date(caseData.dateOfRequest + "T00:00:00");
    return Math.floor((today.getTime() - ra.getTime()) / 86400000);
  }, [caseData.dateOfRequest, today]);

  const countdownBadge = (days: number) => {
    if (days === 0) return <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Due Today</span>;
    if (days <= 7) return <span className="text-xs font-bold bg-red-50 text-red-600 px-2 py-0.5 rounded-full">{days}d</span>;
    if (days <= 14) return <span className="text-xs font-bold bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">{days}d</span>;
    return <span className="text-xs font-medium bg-green-50 text-green-700 px-2 py-0.5 rounded-full">{days}d</span>;
  };

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Case Header */}
      <div className="bg-[#0F2547] text-white rounded-xl p-6 print:border print:border-gray-300 print:bg-white print:text-black">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-blue-200 font-mono text-xs tracking-wider print:text-gray-500">{caseData.caseReference}</div>
            <h1 className="text-2xl font-bold mt-1 print:text-black">{caseData.caseName}</h1>
            <div className="flex gap-6 mt-3 text-sm text-blue-100 flex-wrap print:text-gray-600">
              <span><span className="font-medium">Claimant:</span> {caseData.claimants}</span>
              <span><span className="font-medium">Respondent:</span> {caseData.respondents}</span>
            </div>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${STATUS_COLORS[caseData.status] ?? "bg-gray-100 text-gray-600"}`}>
            {caseData.status}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-5 border-t border-white/20 text-sm print:border-gray-300">
          {caseData.seatOfArbitration && (
            <div><div className="text-blue-300 text-xs uppercase tracking-wide print:text-gray-400">Seat</div><div className="font-medium print:text-gray-800">{caseData.seatOfArbitration}</div></div>
          )}
          {caseData.languageOfArbitration && (
            <div><div className="text-blue-300 text-xs uppercase tracking-wide print:text-gray-400">Language</div><div className="font-medium print:text-gray-800">{caseData.languageOfArbitration}</div></div>
          )}
          {caseData.applicableRules && (
            <div><div className="text-blue-300 text-xs uppercase tracking-wide print:text-gray-400">Rules</div><div className="font-medium print:text-gray-800">{caseData.applicableRules}</div></div>
          )}
          {caseData.dateOfRequest && (
            <div><div className="text-blue-300 text-xs uppercase tracking-wide print:text-gray-400">Request Date</div><div className="font-medium print:text-gray-800">{formatDate(caseData.dateOfRequest)}</div></div>
          )}
          <div><div className="text-blue-300 text-xs uppercase tracking-wide print:text-gray-400">Tribunal</div><div className="font-medium print:text-gray-800">{caseData.tribunalMembers.length} {caseData.tribunalMembers.length === 1 ? "arbitrator" : "arbitrators"}</div></div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Exhibits Filed" value={String(exhibits.length)} icon="📁" />
        <StatCard label="POs Issued" value={String(orders.length)} icon="📋" />
        <StatCard label="Hours Logged" value={`${totalHours.toFixed(1)}h`} icon="⏱" />
        <StatCard label="Costs to Date" value={fmt(totalCosts)} icon="💰" />
        <StatCard label="Days Since RA" value={daysSinceRA !== null ? String(daysSinceRA) : "—"} icon="📅" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deadlines Panel */}
        <div className="space-y-4">
          {overdueDeadlines.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🚨</span>
                <h3 className="font-semibold text-red-800">Overdue Items ({overdueDeadlines.length})</h3>
              </div>
              <div className="space-y-2">
                {overdueDeadlines.map((d: any) => (
                  <div key={d.id} className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-red-900">{d.description}</p>
                      <p className="text-xs text-red-600">{d.responsibleParty} · due {formatDate(d.dueDate)}</p>
                    </div>
                    <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                      {Math.abs(d.daysUntil)}d overdue
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="font-semibold text-[#0F2547] mb-3 flex items-center gap-2">
              <span>📅</span> Upcoming Deadlines
            </h3>
            {upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No upcoming deadlines</p>
            ) : (
              <div className="space-y-3">
                {upcomingDeadlines.map((d: any) => (
                  <div key={d.id} className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{d.description}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{d.responsibleParty} · {formatDate(d.dueDate)}</p>
                    </div>
                    <div className="flex-shrink-0">{countdownBadge(d.daysUntil)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="font-semibold text-[#0F2547] mb-3">Recent Activity</h3>
          {activity.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No activity yet</p>
          ) : (
            <div className="space-y-3">
              {activity.map((item: any, i: number) => (
                <div key={i} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="w-7 h-7 rounded-full bg-[#0F2547]/10 flex items-center justify-center text-sm flex-shrink-0">
                    {ACTIVITY_ICONS[item.type] ?? "📌"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#0F2547]">{item.action}</p>
                    <p className="text-xs text-gray-600 truncate mt-0.5">{item.detail}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(item.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-xl font-bold text-[#0F2547]">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}
