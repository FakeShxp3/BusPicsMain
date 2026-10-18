import Link from "next/link";
import type { OperatorShare } from "@/lib/queries/dashboard";
import { formatPercent } from "@/lib/format";

export function OperatorBreakdown({
  rows,
  total,
}: {
  rows: OperatorShare[];
  total: number;
}) {
  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-[12px] text-muted-foreground">
        No sightings with an operator yet.
      </p>
    );
  }

  const max = Math.max(...rows.map((row) => row.count), 1);

  return (
    <ul className="space-y-3">
      {rows.slice(0, 6).map((row) => (
        <li key={row.operatorId ?? "unassigned"}>
          <Link
            href={
              row.operatorId
                ? `/sightings?operator=${encodeURIComponent(row.operatorId)}`
                : "/sightings"
            }
            className="group block rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-[12.5px] font-medium text-foreground group-hover:text-primary">
                {row.name}
              </span>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                <span className="tabular text-foreground">{row.count}</span>{" "}
                <span className="tabular">({formatPercent(row.count, total)})</span>
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary/75 transition-all group-hover:bg-primary"
                style={{ width: `${Math.max(4, (row.count / max) * 100)}%` }}
              />
            </div>
          </Link>
        </li>
      ))}
      {rows.length > 6 ? (
        <li className="pt-0.5 text-[11px] text-muted-foreground">
          {rows.length - 6} more operator{rows.length - 6 === 1 ? "" : "s"} ·{" "}
          <Link href="/stats" className="text-primary hover:underline">
            see statistics
          </Link>
        </li>
      ) : null}
    </ul>
  );
}
