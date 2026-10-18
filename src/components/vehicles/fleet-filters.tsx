"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGridIcon,
  ListIcon,
  LoaderCircleIcon,
  RotateCcwIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  XIcon,
} from "lucide-react";
import type { VehicleFilters } from "@/lib/queries/vehicles";
import type { ArchiveFacets } from "@/lib/queries/facets";
import { VEHICLE_STATUSES, VEHICLE_STATUS_LABELS } from "@/lib/constants";
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
  { value: "fleet_asc", label: "Fleet number ↑" },
  { value: "fleet_desc", label: "Fleet number ↓" },
  { value: "manufacturer", label: "Manufacturer" },
  { value: "model", label: "Model" },
  { value: "year_desc", label: "Newest model year" },
  { value: "year_asc", label: "Oldest model year" },
  { value: "latest", label: "Latest sighting" },
  { value: "updated", label: "Recently updated" },
];

export function FleetFilters({
  filters,
  facets,
  total,
}: {
  filters: VehicleFilters;
  facets: ArchiveFacets;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(filters.q);

  useEffect(() => {
    setSearch(filters.q);
  }, [filters.q]);

  function buildUrl(next: Partial<Record<string, string>>) {
    const values: Record<string, string> = {
      q: filters.q,
      operator: filters.operator,
      manufacturer: filters.manufacturer,
      model: filters.model,
      category: filters.category,
      powertrain: filters.powertrain,
      status: filters.status,
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
    const timer = window.setTimeout(() => {
      apply({ q: trimmed });
    }, 320);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const chips: { key: keyof VehicleFilters; label: string; value: string }[] = [];
  if (filters.q) chips.push({ key: "q", label: `“${filters.q}”`, value: filters.q });
  if (filters.operator) {
    const operator = facets.operators.find((entry) => entry.id === filters.operator);
    chips.push({ key: "operator", label: operator?.name ?? "Operator", value: filters.operator });
  }
  if (filters.manufacturer) {
    chips.push({ key: "manufacturer", label: filters.manufacturer, value: filters.manufacturer });
  }
  if (filters.model) chips.push({ key: "model", label: filters.model, value: filters.model });
  if (filters.category) chips.push({ key: "category", label: filters.category, value: filters.category });
  if (filters.powertrain) {
    chips.push({ key: "powertrain", label: filters.powertrain, value: filters.powertrain });
  }
  if (filters.status) {
    chips.push({
      key: "status",
      label: VEHICLE_STATUS_LABELS[filters.status],
      value: filters.status,
    });
  }

  const hasFilters = chips.length > 0;

  function clearFilter(key: keyof VehicleFilters) {
    apply({ [key]: "" });
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search fleet number, model, manufacturer or operator…"
            className="pl-8"
            aria-label="Search the fleet database"
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
            label="Manufacturer"
            value={filters.manufacturer}
            onChange={(value) => apply({ manufacturer: value })}
            options={facets.manufacturers.map((value) => ({ value, label: value }))}
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
            label="Powertrain"
            value={filters.powertrain}
            onChange={(value) => apply({ powertrain: value })}
            options={facets.powertrains.map((value) => ({ value, label: value }))}
          />
          <FilterSelect
            label="Status"
            value={filters.status}
            onChange={(value) => apply({ status: value })}
            options={VEHICLE_STATUSES.map((status) => ({
              value: status,
              label: VEHICLE_STATUS_LABELS[status],
            }))}
          />
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Select
            value={filters.sort}
            onValueChange={(value) => apply({ sort: value })}
          >
            <SelectTrigger size="sm" className="w-[164px]" aria-label="Sort vehicles">
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
              onClick={() => apply({ view: "table" })}
              aria-pressed={filters.view === "table"}
              aria-label="Table view"
              className={cn(
                "grid size-8 place-items-center transition-colors",
                filters.view === "table"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              <ListIcon className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => apply({ view: "grid" })}
              aria-pressed={filters.view === "grid"}
              aria-label="Grid view"
              className={cn(
                "grid size-8 place-items-center border-l border-border transition-colors",
                filters.view === "grid"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              <LayoutGridIcon className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {hasFilters ? (
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
                onClick={() => clearFilter(chip.key)}
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
            {total} vehicle{total === 1 ? "" : "s"}
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
      <SelectTrigger size="sm" className="w-[148px]" aria-label={label}>
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
