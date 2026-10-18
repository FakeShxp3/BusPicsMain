"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDaysIcon, RotateCcwIcon } from "lucide-react";
import type { StatsFilters } from "@/lib/queries/stats";
import type { ArchiveFacets } from "@/lib/queries/facets";
import { endOfLocalDayIso, formatIsoDay, startOfLocalDayIso } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Preset = { label: string; days: number | "year" | "all" };

const PRESETS: Preset[] = [
  { label: "All time", days: "all" },
  { label: "90 days", days: 90 },
  { label: "30 days", days: 30 },
  { label: "This year", days: "year" },
];

export function StatsFiltersBar({
  filters,
  facets,
  timeZone,
}: {
  filters: StatsFilters;
  facets: ArchiveFacets;
  timeZone: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [fromDate, setFromDate] = useState(
    filters.from ? formatIsoDay(filters.from, timeZone) : "",
  );
  const [toDate, setToDate] = useState(
    filters.to ? formatIsoDay(filters.to, timeZone) : "",
  );
  const [activePreset, setActivePreset] = useState<string>(
    filters.from || filters.to ? "" : "All time",
  );

  useEffect(() => {
    setFromDate(filters.from ? formatIsoDay(filters.from, timeZone) : "");
    setToDate(filters.to ? formatIsoDay(filters.to, timeZone) : "");
  }, [filters.from, filters.to, timeZone]);

  function apply(next: Partial<Record<string, string>>) {
    const values: Record<string, string> = {
      from: filters.from ?? "",
      to: filters.to ?? "",
      operator: filters.operator,
      category: filters.category,
      ...next,
    };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(values)) {
      if (value) params.set(key, value);
    }
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }

  function applyPreset(preset: Preset) {
    setActivePreset(preset.label);
    if (preset.days === "all") {
      setFromDate("");
      setToDate("");
      apply({ from: "", to: "" });
      return;
    }

    const now = new Date();
    let start: Date;
    if (preset.days === "year") {
      start = new Date(now.getFullYear(), 0, 1);
    } else {
      start = new Date(now);
      start.setDate(start.getDate() - preset.days);
    }
    setFromDate(formatIsoDay(start.toISOString(), timeZone));
    setToDate("");
    apply({ from: start.toISOString(), to: "" });
  }

  return (
    <div className="space-y-2.5 rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[10.5px] tracking-wide text-muted-foreground uppercase">
          Range
        </span>
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => applyPreset(preset)}
            className={
              activePreset === preset.label
                ? "rounded border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary"
                : "rounded border border-border bg-card px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            }
          >
            {preset.label}
          </button>
        ))}

        <div className="ml-1 flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1">
          <CalendarDaysIcon className="size-3.5 text-muted-foreground" />
          <input
            type="date"
            value={fromDate}
            onChange={(event) => {
              setFromDate(event.target.value);
              setActivePreset("");
              apply({ from: startOfLocalDayIso(event.target.value) ?? "" });
            }}
            aria-label="Statistics from date"
            className="w-[108px] bg-transparent font-mono text-[11px] text-foreground outline-none"
          />
          <span className="text-muted-foreground">–</span>
          <input
            type="date"
            value={toDate}
            onChange={(event) => {
              setToDate(event.target.value);
              setActivePreset("");
              apply({ to: endOfLocalDayIso(event.target.value) ?? "" });
            }}
            aria-label="Statistics to date"
            className="w-[108px] bg-transparent font-mono text-[11px] text-foreground outline-none"
          />
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <Select
            value={filters.operator || "all"}
            onValueChange={(value) => apply({ operator: value === "all" ? "" : value })}
          >
            <SelectTrigger size="sm" className="w-[142px]" aria-label="Operator">
              <SelectValue placeholder="Operator" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Operator: all</SelectItem>
              {facets.operators.map((operator) => (
                <SelectItem key={operator.id} value={operator.id}>
                  {operator.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.category || "all"}
            onValueChange={(value) => apply({ category: value === "all" ? "" : value })}
          >
            <SelectTrigger size="sm" className="w-[142px]" aria-label="Category">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Category: all</SelectItem>
              {facets.categories.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-[11px]">
            <a href={pathname}>
              <RotateCcwIcon className="size-3" />
              Reset
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
