import { titleCase } from "@/lib/format";

const DEAL_STATUS_STYLES: Record<string, string> = {
  active: "bg-teal-50 text-teal-700",
  pending: "bg-amber-50 text-amber-700",
  sold: "bg-slate-100 text-slate-600",
  archived: "bg-slate-100 text-slate-500",
};

const INTEREST_STATUS_STYLES: Record<string, string> = {
  sent: "bg-slate-100 text-slate-600",
  viewed: "bg-blue-50 text-blue-700",
  interested: "bg-green-50 text-green-700",
  passed: "bg-red-50 text-red-700",
};

export function DealStatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${DEAL_STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600"}`}>
      {titleCase(status)}
    </span>
  );
}

export function InterestStatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${INTEREST_STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600"}`}>
      {titleCase(status)}
    </span>
  );
}
