"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BusFrontIcon,
  CameraIcon,
  CornerDownLeftIcon,
  LoaderCircleIcon,
  SearchIcon,
  SearchXIcon,
  UsersIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SearchResponse } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type FlatItem = {
  key: string;
  href: string;
  label: string;
  sub: string;
  group: "Vehicles" | "Sightings" | "Operators";
  icon: LucideIcon;
};

const EMPTY: SearchResponse = { vehicles: [], sightings: [], operators: [] };
const GROUPS = ["Vehicles", "Sightings", "Operators"] as const;

export function GlobalSearch({ timeZone }: { timeZone: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [shortcut, setShortcut] = useState("Ctrl K");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setShortcut(/mac|iphone|ipad/i.test(navigator.userAgent) ? "⌘K" : "Ctrl K");
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      setQuery("");
      setResults(EMPTY);
      setError(null);
      setLoading(false);
      setActive(0);
    }
  }, [open]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!open) return;
    if (trimmed.length < 2) {
      abortRef.current?.abort();
      setResults(EMPTY);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          throw new Error(`Search failed with status ${response.status}`);
        }
        const payload = (await response.json()) as SearchResponse;
        setResults(payload);
        setActive(0);
        setLoading(false);
      } catch (caught) {
        if (controller.signal.aborted) return;
        setError(
          caught instanceof Error && /status/.test(caught.message)
            ? "Search is unavailable right now. Try again in a moment."
            : "Could not reach the search service. Check your connection.",
        );
        setLoading(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, open]);

  const flat = useMemo<FlatItem[]>(() => {
    const items: FlatItem[] = [];
    for (const vehicle of results.vehicles) {
      items.push({
        key: `vehicle-${vehicle.id}`,
        href: `/fleet/${vehicle.id}`,
        label: vehicle.fleet_number ? `Fleet ${vehicle.fleet_number}` : "Unnumbered vehicle",
        sub: [vehicle.operator_name, vehicle.manufacturer, vehicle.model]
          .filter(Boolean)
          .join(" · "),
        group: "Vehicles",
        icon: BusFrontIcon,
      });
    }
    for (const sighting of results.sightings) {
      items.push({
        key: `sighting-${sighting.id}`,
        href: `/sightings/${sighting.id}`,
        label: sighting.fleet_number
          ? `Fleet ${sighting.fleet_number} sighting`
          : "Vehicle sighting",
        sub: [
          formatDateTime(sighting.spotted_at, "medium", "12h", timeZone),
          sighting.route ? `Route ${sighting.route}` : null,
          sighting.location_name,
        ]
          .filter(Boolean)
          .join(" · "),
        group: "Sightings",
        icon: CameraIcon,
      });
    }
    for (const operator of results.operators) {
      items.push({
        key: `operator-${operator.id}`,
        href: `/fleet?operator=${operator.id}`,
        label: operator.name,
        sub: operator.abbreviation ? `Operator · ${operator.abbreviation}` : "Operator",
        group: "Operators",
        icon: UsersIcon,
      });
    }
    return items;
  }, [results, timeZone]);

  useEffect(() => {
    if (flat.length === 0) return;
    setActive((current) => Math.min(current, flat.length - 1));
  }, [flat.length]);

  useEffect(() => {
    if (!open) return;
    const element = document.getElementById(`global-search-item-${active}`);
    element?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  const trimmed = query.trim();
  const showHint = trimmed.length < 2;
  const showNoResults =
    !showHint && !loading && !error && flat.length === 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-8 w-full max-w-sm items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 text-left text-[13px] text-muted-foreground transition-colors hover:border-input hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:flex"
        aria-label="Search the archive"
      >
        <SearchIcon className="size-3.5 shrink-0" />
        <span className="flex-1 truncate">Search fleet, sightings, routes…</span>
        <kbd className="rounded border border-border bg-card px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
          {shortcut}
        </kbd>
      </button>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:hidden"
        aria-label="Search"
      >
        <SearchIcon className="size-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="top-[8%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">Search TransitSpotter</DialogTitle>
          <DialogDescription className="sr-only">
            Search your fleet database, sightings and operators. Use arrow keys to
            move through results and Enter to open one.
          </DialogDescription>

          <div className="flex items-center gap-2 border-b border-border px-3">
            <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActive((current) =>
                    flat.length === 0 ? 0 : Math.min(current + 1, flat.length - 1),
                  );
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActive((current) => Math.max(current - 1, 0));
                } else if (event.key === "Enter") {
                  event.preventDefault();
                  const item = flat[active];
                  if (item) navigate(item.href);
                }
              }}
              placeholder="Fleet number, operator, model, route, place or note…"
              className="h-12 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
              aria-label="Search query"
              aria-controls="global-search-results"
              aria-activedescendant={
                flat[active] ? `global-search-item-${active}` : undefined
              }
              role="combobox"
              aria-expanded={flat.length > 0}
              autoComplete="off"
              spellCheck={false}
            />
            {loading ? (
              <LoaderCircleIcon className="size-4 shrink-0 animate-spin text-muted-foreground" />
            ) : null}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground hover:bg-muted"
            >
              esc
            </button>
          </div>

          <div
            id="global-search-results"
            className="scrollbar-thin max-h-[min(58vh,420px)] overflow-y-auto p-1.5"
            role="listbox"
            aria-label="Search results"
          >
            {showHint ? (
              <div className="px-3 py-8 text-center">
                <p className="text-[13px] text-muted-foreground">
                  Search across your whole archive.
                </p>
                <p className="mt-1 text-xs text-muted-foreground/80">
                  Try a fleet number like{" "}
                  <span className="font-mono text-foreground">1204</span>, a route like{" "}
                  <span className="font-mono text-foreground">N19</span>, or a place.
                </p>
              </div>
            ) : null}

            {error ? (
              <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
                <p className="text-[13px] font-medium text-foreground">Search failed</p>
                <p className="text-xs text-muted-foreground">{error}</p>
                <button
                  type="button"
                  className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                  onClick={() => setQuery((current) => `${current} `.trimEnd())}
                >
                  Try again
                </button>
              </div>
            ) : null}

            {showNoResults ? (
              <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
                <SearchXIcon className="size-5 text-muted-foreground" />
                <p className="text-[13px] font-medium text-foreground">
                  No matches for “{trimmed}”
                </p>
                <p className="max-w-xs text-xs text-muted-foreground">
                  Search fleet numbers, operators, manufacturers, models, routes,
                  locations and notes.
                </p>
              </div>
            ) : null}

            {!showHint && !error
              ? GROUPS.map((group) => {
                  const groupItems = flat.filter((item) => item.group === group);
                  if (groupItems.length === 0) return null;
                  return (
                    <div key={group} className="mb-1">
                      <p className="px-2 pt-2 pb-1 font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
                        {group}
                      </p>
                      {groupItems.map((item) => {
                        const index = flat.indexOf(item);
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.key}
                            id={`global-search-item-${index}`}
                            type="button"
                            role="option"
                            aria-selected={index === active}
                            onMouseEnter={() => setActive(index)}
                            onClick={() => navigate(item.href)}
                            className={cn(
                              "flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left transition-colors",
                              index === active ? "bg-muted" : "hover:bg-muted/60",
                            )}
                          >
                            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded border border-border bg-card text-muted-foreground">
                              <Icon className="size-3.5" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-medium text-foreground">
                                {item.label}
                              </span>
                              {item.sub ? (
                                <span className="block truncate text-[11px] text-muted-foreground">
                                  {item.sub}
                                </span>
                              ) : null}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              : null}
          </div>

          <div className="hidden items-center justify-between border-t border-border px-3 py-2 text-[10px] text-muted-foreground sm:flex">
            <span className="flex items-center gap-1.5">
              <CornerDownLeftIcon className="size-3" /> open
              <span className="mx-1 text-border">|</span>
              <span className="font-mono">↑↓</span> navigate
            </span>
            <span>
              {loading
                ? "Searching…"
                : flat.length > 0
                  ? `${flat.length} result${flat.length === 1 ? "" : "s"}`
                  : "Private archive"}
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
