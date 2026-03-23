import { cn } from "@/lib/utils";
import { CaseStatus } from "@workspace/api-client-react";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const styles: Record<string, string> = {
    [CaseStatus.Active]: "bg-blue-100 text-blue-800 border-blue-200",
    [CaseStatus.Pending]: "bg-amber-100 text-amber-800 border-amber-200",
    [CaseStatus.Closed]: "bg-slate-100 text-slate-600 border-slate-200",
    [CaseStatus.Suspended]: "bg-rose-100 text-rose-800 border-rose-200",
  };

  const defaultStyle = "bg-slate-100 text-slate-800 border-slate-200";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-sm",
        styles[status] || defaultStyle,
        className
      )}
    >
      {status}
    </span>
  );
}
