"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import type { MapDefaults, MapSighting } from "@/lib/map-types";

const SightingsMapInner = dynamic(() => import("./sightings-map-inner"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-muted" aria-hidden="true" />,
});

export function SightingsMap({
  points,
  defaults,
  className,
  emptyMessage = "No sightings have coordinates yet.",
}: {
  points: MapSighting[];
  defaults?: MapDefaults;
  className?: string;
  emptyMessage?: string;
}) {
  if (points.length === 0) {
    return (
      <div
        className={cn(
          "grid place-items-center rounded-md border border-dashed border-border bg-muted/20 px-6 py-12 text-center",
          className,
        )}
      >
        <p className="max-w-xs text-[12px] leading-relaxed text-muted-foreground">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-md border border-border", className)}>
      <SightingsMapInner points={points} defaults={defaults} />
    </div>
  );
}
