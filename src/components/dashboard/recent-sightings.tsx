import Link from "next/link";
import { ArrowUpRightIcon, CameraOffIcon } from "lucide-react";
import type { SightingOverview } from "@/lib/db/database.types";
import type { DateStyle, TimeFormat } from "@/lib/db/database.types";
import { formatDateTime } from "@/lib/format";
import { PhotoImage } from "@/components/common/photo-image";

export function RecentSightings({
  sightings,
  coverUrls,
  timeZone,
  dateStyle,
  timeFormat,
}: {
  sightings: SightingOverview[];
  coverUrls: Record<string, string>;
  timeZone: string;
  dateStyle: DateStyle;
  timeFormat: TimeFormat;
}) {
  if (sightings.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <CameraOffIcon className="size-5 text-muted-foreground" />
        <p className="text-[13px] font-medium">No sightings recorded yet</p>
        <p className="max-w-xs text-[11.5px] text-muted-foreground">
          Record the first bus you photograph and it will appear here.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border/70">
      {sightings.map((sighting) => {
        const coverUrl = sighting.cover_storage_path
          ? coverUrls[sighting.cover_storage_path]
          : undefined;
        return (
          <li key={sighting.id}>
            <Link
              href={`/sightings/${sighting.id}`}
              className="group flex items-center gap-3 py-2.5 first:pt-0 last:pb-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span className="photo-frame block h-12 w-16 shrink-0 rounded border border-border">
                <PhotoImage
                  src={coverUrl}
                  alt={
                    sighting.fleet_number
                      ? `Fleet ${sighting.fleet_number} photograph`
                      : "Sighting photograph"
                  }
                  className="h-full w-full"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-mono text-[13px] font-semibold text-foreground group-hover:text-primary">
                    {sighting.fleet_number ? `#${sighting.fleet_number}` : "Unnumbered"}
                  </span>
                  <span className="truncate text-[11.5px] text-muted-foreground">
                    {[sighting.operator_name, sighting.model].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                  {formatDateTime(sighting.spotted_at, dateStyle, timeFormat, timeZone)}
                  {sighting.route ? ` · Route ${sighting.route}` : ""}
                  {sighting.location_name ? ` · ${sighting.location_name}` : ""}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2 text-[10px] text-muted-foreground">
                {sighting.photo_count > 0 ? (
                  <span className="rounded border border-border px-1 py-0.5 font-mono">
                    {sighting.photo_count}
                  </span>
                ) : null}
                <ArrowUpRightIcon className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
