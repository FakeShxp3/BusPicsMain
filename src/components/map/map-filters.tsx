"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDaysIcon, RotateCcwIcon } from "lucide-react";
import type { MapFilters } from "@/lib/queries/map";
import type { ArchiveFacets } from "@/lib/queries/facets";
import {
  endOfLocalDayIso,
  formatIsoDay,
  startOfLocalDayIso,
} from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function MapFiltersBar({
  filters,
  facets,
  timeZone,
  count,
}: {
  filters: MapFilters;
  facets: ArchiveFacets;
  timeZone: string;
  count: number;
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

  useEffect(() => {
    setFromDate(filters.from ? formatIsoDay(filters.from, timeZone) : "");
    setToDate(filters.to ? formatIsoDay(filters.to, timeZone) : "");
  }, [filters.from, filters.to, timeZone]);

  function apply(next: Partial<Record<string, string>>) {
    const values: Record<string, string> = {
      operator: filters.operator,
      model: filters.model,
      route: filters.route,
      from: filters.from ?? "",
      to: filters.to ?? "",
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

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-card p-2.5">
      <FilterSelect
        label="Operator"
        value={filters.operator}
        onChange={(value) => apply({ operator: value })}
        options={facets.operators.map((operator) => ({
          value: operator.id,
          label: operator.name,
        }))}
      />
      <FilterSelect
        label="Model"
        value={filters.model}
        onChange={(value) => apply({ model: value })}
        options={facets.models.map((value) => ({ value, label: value }))}
      />
      <FilterSelect
        label="Route"
        value={filters.route}
        onChange={(value) => apply({ route: value })}
        options={facets.routes.map((value) => ({ value, label: value }))}
      />

      <div className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1">
        <CalendarDaysIcon className="size-3.5 text-muted-foreground" />
        <input
          type="date"
          value={fromDate}
          onChange={(event) => {
            setFromDate(event.target.value);
            apply({ from: startOfLocalDayIso(event.target.value) ?? "" });
          }}
          aria-label="Sightings from date"
          className="w-[110px] bg-transparent font-mono text-[11px] text-foreground outline-none"
        />
        <span className="text-muted-foreground">–</span>
        <input
          type="date"
          value={toDate}
          onChange={(event) => {
            setToDate(event.target.value);
            apply({ to: endOfLocalDayIso(event.target.value) ?? "" });
          }}
          aria-label="Sightings to date"
          className="w-[110px] bg-transparent font-mono text-[11px] text-foreground outline-none"
        />
      </div>

      <span className="ml-auto text-[11px] text-muted-foreground">
        {count} located sighting{count === 1 ? "" : "s"}
      </span>
      <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-[11px]">
        <a href={pathname}>
          <RotateCcwIcon className="size-3" />
          Reset
        </a>
      </Button>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value || "all"} onValueChange={(next) => onChange(next === "all" ? "" : next)}>
      <SelectTrigger size="sm" className="w-[136px]" aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{label}: all</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
