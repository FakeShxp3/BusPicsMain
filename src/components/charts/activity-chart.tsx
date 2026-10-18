"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

export type ActivityPoint = {
  month: string;
  label: string;
  sightings: number;
  photos: number;
};

const TOOLTIP_STYLE = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  fontSize: "12px",
  color: "var(--popover-foreground)",
  boxShadow: "0 8px 24px -12px rgb(0 0 0 / 0.35)",
};

export function ActivityChart({
  data,
  height = 240,
  className,
}: {
  data: ActivityPoint[];
  height?: number;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        className={cn("w-full animate-pulse rounded bg-muted/50", className)}
        style={{ height }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 4" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={16}
            tickFormatter={(value: string) => value.split(" ")[0] ?? value}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={44}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={{ color: "var(--foreground)", fontWeight: 600 }}
            cursor={{ fill: "color-mix(in oklch, var(--primary) 8%, transparent)" }}
            formatter={(value, name) => [
              String(value ?? 0),
              name === "sightings" ? "Sightings" : "Photographs",
            ]}
          />
          <Bar
            dataKey="sightings"
            fill="var(--chart-1)"
            radius={[3, 3, 0, 0]}
            maxBarSize={28}
          />
          <Line
            type="monotone"
            dataKey="photos"
            stroke="var(--chart-3)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChartLegend({
  items,
}: {
  items: { label: string; color: string; shape?: "bar" | "line" }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          {item.shape === "line" ? (
            <span
              className="inline-block h-0.5 w-4 rounded-full"
              style={{ backgroundColor: item.color }}
            />
          ) : (
            <span
              className="inline-block size-2.5 rounded-[2px]"
              style={{ backgroundColor: item.color }}
            />
          )}
          {item.label}
        </span>
      ))}
    </div>
  );
}
