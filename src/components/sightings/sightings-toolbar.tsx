"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDaysIcon,
  ImagesIcon,
  LayoutListIcon,
  LoaderCircleIcon,
  RotateCcwIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  XIcon,
} from "lucide-react";
import type { SightingFilters } from "@/lib/queries/sightings";
import type { ArchiveFacets } from "@/lib/queries/facets";
import { formatIsoDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "fleet_asc", label: "Fleet number ↑" },
  { value: "fleet_desc", label: "Fleet number ↓" },
];

function toStartIso(date: string): string | null {
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function toEndIso(date: string): string | null {
  if (!date) return null;
  const parsed = new Date(`${date}T23:59:59.999`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function SightingsToolbar({
  filters,
  facets,
  total,
  timeZone,
  operatorName,
  vehicleLabel,
}: {
  filters: SightingFilters;
  facets: ArchiveFacets;
  total: number;
  timeZone: string;
  operatorName?: string;
  vehicleLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(filters.q);
  const [fromDate, setFromDate] = useState(
    filters.from ? formatIsoDay(filters.from, timeZone) : "",
  );
  const [toDate, setToDate] = useState(
    filters.to ? formatIsoDay(filters.to, timeZone) : "",
  );

  useEffect(() => setSearch(filters.q), [filters.q]);
  useEffect(() => {
    setFromDate(filters.from ? formatIsoDay(filters.from, timeZone) : "");
    setToDate(filters.to ? formatIsoDay(filters.to, timeZone) : "");
  }, [filters.from, filters.to, timeZone]);

  function buildUrl(next: Partial<Record<string, string>>) {
    const values: Record<string, string> = {
      q: filters.q,
      operator: filters.operator,
      model: filters.model,
      category: filters.category,
      route: filters.route,
      vehicle: filters.vehicle,
      from: filters.from ?? "",
      to: filters.to ?? "",
      sort: filters.sort,
      view: filters.view,
      ...next,
    };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(values)) {
      if (value) params.set(key, value);
    }
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  function apply(next: Partial<Record<string, string>>) {
    startTransition(() => {
      router.replace(buildUrl(next), { scroll: false });
    });
  }

  useEffect(() => {
    const trimmed = search.trim();
    if (trimmed === filters.q) return;
    const timer = window.setTimeout(() => apply({ q: trimmed }), 320);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const chips: { key: string; label: string; clear: Partial<Record<string, string>> }[] = [];
  if (filters.q) chips.push({ key: "q", label: `“${filters.q}”`, clear: { q: "" } });
  if (filters.operator) {
    chips.push({
      key: "operator",
      label: operatorName ?? "Operator",
      clear: { operator: "" },
    });
  }
  if (filters.vehicle) {
    chips.push({
      key: "vehicle",
      label: vehicleLabel ?? "This vehicle",
      clear: { vehicle: "" },
    });
  }
  if (filters.model) chips.push({ key: "model", label: filters.model, clear: { model: "" } });
  if (filters.category) {
    chips.push({ key: "category", label: filters.category, clear: { category: "" } });
  }
  if (filters.route) chips.push({ key: "route", label: `Route ${filters.route}`, clear: { route: "" } });
  if (filters.from) {
    chips.push({
      key: "from",
      label: `From ${fromDate}`,
      clear: { from: "" },
    });
  }
  if (filters.to) {
    chips.push({ key: "to", label: `To ${toDate}`, clear: { to: "" } });
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search fleet number, operator, route, place or notes…"
            className="pl-8"
            aria-label="Search sightings"
          />
          {pending ? (
            <LoaderCircleIcon className="absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
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
            label="Category"
            value={filters.category}
            onChange={(value) => apply({ category: value })}
            options={facets.categories.map((value) => ({ value, label: value }))}
          />
          <FilterSelect
            label="Route"
            value={filters.route}
            onChange={(value) => apply({ route: value })}
            options={facets.routes.map((value) => ({ value, label: value }))}
          />
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1">
            <CalendarDaysIcon className="size-3.5 text-muted-foreground" />
            <input
              type="date"
              value={fromDate}
              onChange={(event) => {
                setFromDate(event.target.value);
                apply({ from: toStartIso(event.target.value) ?? "" });
              }}
              aria-label="Sightings from date"
              className="w-[112px] bg-transparent font-mono text-[11px] text-foreground outline-none"
            />
            <span className="text-muted-foreground">–</span>
            <input
              type="date"
              value={toDate}
              onChange={(event) => {
                setToDate(event.target.value);
                apply({ to: toEndIso(event.target.value) ?? "" });
              }}
              aria-label="Sightings to date"
              className="w-[112px] bg-transparent font-mono text-[11px] text-foreground outline-none"
            />
          </div>

          <Select value={filters.sort} onValueChange={(value) => apply({ sort: value })}>
            <SelectTrigger size="sm" className="w-[148px]" aria-label="Sort sightings">
              <SlidersHorizontalIcon className="size-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex overflow-hidden rounded-md border border-border">
            <button
              type="button"
              onClick={() => apply({ view: "list" })}
              aria-pressed={filters.view === "list"}
              aria-label="List view"
              className={cn(
                "grid size-8 place-items-center transition-colors",
                filters.view === "list"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              <LayoutListIcon className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => apply({ view: "gallery" })}
              aria-pressed={filters.view === "gallery"}
              aria-label="Gallery view"
              className={cn(
                "grid size-8 place-items-center border-l border-border transition-colors",
                filters.view === "gallery"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              <ImagesIcon className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border/70 pt-2.5">
          <span className="text-[10.5px] tracking-wide text-muted-foreground uppercase">
            Filters
          </span>
          {chips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 rounded border border-border bg-muted/50 py-0.5 pr-1 pl-1.5 text-[11px] text-foreground"
            >
              {chip.label}
              <button
                type="button"
                onClick={() => apply(chip.clear)}
                className="rounded p-0.5 text-muted-foreground hover:bg-border hover:text-foreground"
                aria-label={`Remove filter ${chip.label}`}
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ))}
          <Button asChild variant="ghost" size="sm" className="h-6 px-1.5 text-[11px]">
            <a href={pathname}>
              <RotateCcwIcon className="size-3" />
              Reset all
            </a>
          </Button>
          <span className="ml-auto text-[11px] text-muted-foreground">
            {total} sighting{total === 1 ? "" : "s"}
          </span>
        </div>
      ) : null}
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
