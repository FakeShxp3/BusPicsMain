"use client";

import { useEffect, useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { CHART_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type DonutDatum = {
  name: string;
  count: number;
};

export function DistributionDonut({
  data,
  centerLabel,
  centerValue,
  height = 220,
  className,
}: {
  data: DonutDatum[];
  centerLabel: string;
  centerValue: string;
  height?: number;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative" style={{ height }}>
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="name"
                innerRadius="62%"
                outerRadius="88%"
                paddingAngle={2}
                stroke="var(--card)"
                strokeWidth={2}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "var(--popover-foreground)",
                }}
                formatter={(value, name) => [
                  `${String(value ?? 0)} (${total > 0 ? Math.round((Number(value ?? 0) / total) * 100) : 0}%)`,
                  String(name),
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full animate-pulse rounded-full bg-muted/40" />
        )}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="numeric text-lg font-semibold text-foreground">{centerValue}</span>
          <span className="mt-0.5 text-[10px] tracking-wide text-muted-foreground uppercase">
            {centerLabel}
          </span>
        </div>
      </div>

      <ul className="grid gap-1.5">
        {data.slice(0, 6).map((item, index) => (
          <li
            key={item.name}
            className="flex items-center justify-between gap-2 text-[11.5px]"
          >
            <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
              <span
                className="size-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
              />
              <span className="truncate">{item.name}</span>
            </span>
            <span className="tabular shrink-0 text-foreground">{item.count}</span>
          </li>
        ))}
        {data.length === 0 ? (
          <li className="text-[11.5px] text-muted-foreground">No data recorded.</li>
        ) : null}
      </ul>
    </div>
  );
}
