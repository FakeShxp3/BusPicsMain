import Link from "next/link";
import { CameraIcon, MapPinIcon } from "lucide-react";
import type { VehicleOverview } from "@/lib/db/database.types";
import { formatDate } from "@/lib/format";
import type { DateStyle } from "@/lib/db/database.types";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/vehicles/status-badge";
import { PhotoImage } from "@/components/common/photo-image";

export function VehicleCard({
  vehicle,
  coverUrl,
  timeZone,
  dateStyle,
  className,
}: {
  vehicle: VehicleOverview;
  coverUrl: string | null;
  timeZone: string;
  dateStyle: DateStyle;
  className?: string;
}) {
  const title = vehicle.fleet_number ? `#${vehicle.fleet_number}` : "Unnumbered vehicle";

  return (
    <Link
      href={`/fleet/${vehicle.id}`}
      className={cn(
        "photo-link group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/40 focus-visible:border-primary focus-visible:outline-none",
        className,
      )}
    >
      <div className="photo-frame aspect-[4/3] w-full">
        <PhotoImage
          src={coverUrl}
          alt={
            vehicle.fleet_number
              ? `Fleet ${vehicle.fleet_number}${vehicle.model ? ` ${vehicle.model}` : ""}`
              : "Vehicle photograph"
          }
          className="h-full w-full"
        />
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span className="rounded border border-white/15 bg-black/55 px-1.5 py-0.5 font-mono text-[11px] font-medium text-white">
            {title}
          </span>
        </div>
        {vehicle.photo_count > 0 ? (
          <span className="absolute right-2.5 bottom-2.5 inline-flex items-center gap-1 rounded border border-white/15 bg-black/55 px-1.5 py-0.5 text-[10px] text-white/90">
            <CameraIcon className="size-2.5" />
            {vehicle.photo_count}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-foreground">
              {vehicle.model ?? "Model not recorded"}
              {vehicle.generation ? (
                <span className="font-normal text-muted-foreground"> · {vehicle.generation}</span>
              ) : null}
            </p>
            <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
              {vehicle.operator_name ?? "No operator"}
            </p>
          </div>
          <StatusBadge status={vehicle.status} />
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPinIcon className="size-3" />
            {vehicle.last_spotted_at
              ? formatDate(vehicle.last_spotted_at, dateStyle, timeZone)
              : "Not yet spotted"}
          </span>
          <span className="tabular">
            {vehicle.sighting_count} sighting{vehicle.sighting_count === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    </Link>
  );
}
