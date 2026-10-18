"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDaysIcon,
  LayoutGridIcon,
  LoaderCircleIcon,
  RotateCcwIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import type { GalleryFilters } from "@/lib/queries/gallery";
import type { ArchiveFacets } from "@/lib/queries/facets";
import type { GalleryDensity } from "@/lib/db/database.types";
import {
  endOfLocalDayIso,
  formatIsoDay,
  startOfLocalDayIso,
} from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DENSITIES: { value: GalleryDensity; label: string }[] = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfortable" },
  { value: "spacious", label: "Spacious" },
];

export function GalleryToolbar({
  filters,
  facets,
  total,
  timeZone,
}: {
  filters: GalleryFilters;
  facets: ArchiveFacets;
  total: number;
  timeZone: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(filters.q);
  const [location, setLocation] = useState(filters.location);
  const [fromDate, setFromDate] = useState(
    filters.from ? formatIsoDay(filters.from, timeZone) : "",
  );
  const [toDate, setToDate] = useState(
    filters.to ? formatIsoDay(filters.to, timeZone) : "",
  );

  useEffect(() => setSearch(filters.q), [filters.q]);
  useEffect(() => setLocation(filters.location), [filters.location]);
  useEffect(() => {
    setFromDate(filters.from ? formatIsoDay(filters.from, timeZone) : "");
    setToDate(filters.to ? formatIsoDay(filters.to, timeZone) : "");
  }, [filters.from, filters.to, timeZone]);

  function buildUrl(next: Partial<Record<string, string>>) {
    const values: Record<string, string> = {
      q: filters.q,
      operator: filters.operator,
      manufacturer: filters.manufacturer,
      model: filters.model,
      route: filters.route,
      location: filters.location,
      from: filters.from ?? "",
      to: filters.to ?? "",
      density: filters.density,
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

  useEffect(() => {
    const trimmed = location.trim();
    if (trimmed === filters.location) return;
    const timer = window.setTimeout(() => apply({ location: trimmed }), 420);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  const chips: { key: string; label: string; clear: Partial<Record<string, string>> }[] = [];
  if (filters.q) chips.push({ key: "q", label: `“${filters.q}”`, clear: { q: "" } });
  if (filters.operator) {
    chips.push({
      key: "operator",
      label:
        facets.operators.find((operator) => operator.id === filters.operator)?.name ??
        "Operator",
      clear: { operator: "" },
    });
  }
  if (filters.manufacturer) {
    chips.push({ key: "manufacturer", label: filters.manufacturer, clear: { manufacturer: "" } });
  }
  if (filters.model) chips.push({ key: "model", label: filters.model, clear: { model: "" } });
  if (filters.route) chips.push({ key: "route", label: `Route ${filters.route}`, clear: { route: "" } });
  if (filters.location) {
    chips.push({ key: "location", label: filters.location, clear: { location: "" } });
  }
  if (filters.from) {
    chips.push({ key: "from", label: `From ${fromDate}`, clear: { from: "" } });
  }
  if (filters.to) chips.push({ key: "to", label: `To ${toDate}`, clear: { to: "" } });

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[190px] flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search fleet, operator, route, caption…"
            className="pl-8"
            aria-label="Search photographs"
          />
          {pending ? (
            <LoaderCircleIcon className="absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : null}
        </div>

        <div className="relative w-[170px]">
          <Input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Location contains…"
            className="h-8 text-xs"
            aria-label="Filter by location"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Select
            value={filters.operator || "all"}
            onValueChange={(value) => apply({ operator: value === "all" ? "" : value })}
          >
            <SelectTrigger size="sm" className="w-[150px]" aria-label="Operator">
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
            value={filters.manufacturer || "all"}
            onValueChange={(value) =>
              apply({ manufacturer: value === "all" ? "" : value })
            }
          >
            <SelectTrigger size="sm" className="w-[162px]" aria-label="Manufacturer">
              <SelectValue placeholder="Manufacturer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Manufacturer: all</SelectItem>
              {facets.manufacturers.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.model || "all"}
            onValueChange={(value) => apply({ model: value === "all" ? "" : value })}
          >
            <SelectTrigger size="sm" className="w-[144px]" aria-label="Model">
              <SelectValue placeholder="Model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Model: all</SelectItem>
              {facets.models.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.route || "all"}
            onValueChange={(value) => apply({ route: value === "all" ? "" : value })}
          >
            <SelectTrigger size="sm" className="w-[126px]" aria-label="Route">
              <SelectValue placeholder="Route" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Route: all</SelectItem>
              {facets.routes.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1">
            <CalendarDaysIcon className="size-3.5 text-muted-foreground" />
            <input
              type="date"
              value={fromDate}
              onChange={(event) => {
                setFromDate(event.target.value);
                apply({ from: startOfLocalDayIso(event.target.value) ?? "" });
              }}
              aria-label="Photographs from date"
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
              aria-label="Photographs to date"
              className="w-[110px] bg-transparent font-mono text-[11px] text-foreground outline-none"
            />
          </div>

          <Select
            value={filters.density}
            onValueChange={(value) => apply({ density: value })}
          >
            <SelectTrigger size="sm" className="w-[148px]" aria-label="Gallery density">
              <LayoutGridIcon className="size-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DENSITIES.map((density) => (
                <SelectItem key={density.value} value={density.value}>
                  {density.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            {total} photograph{total === 1 ? "" : "s"}
          </span>
        </div>
      ) : null}
    </div>
  );
}
