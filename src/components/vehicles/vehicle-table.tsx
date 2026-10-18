import Link from "next/link";
import { ChevronRightIcon, ImagesIcon } from "lucide-react";
import type { VehicleOverview } from "@/lib/db/database.types";
import type { DateStyle } from "@/lib/db/database.types";
import { formatDate, formatLength } from "@/lib/format";
import { StatusBadge } from "@/components/vehicles/status-badge";
import { PhotoImage } from "@/components/common/photo-image";

export function VehicleTable({
  vehicles,
  coverUrls,
  timeZone,
  dateStyle,
  units,
}: {
  vehicles: VehicleOverview[];
  coverUrls: Record<string, string>;
  timeZone: string;
  dateStyle: DateStyle;
  units: "metric" | "imperial";
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="hidden md:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
              <th scope="col" className="px-3 py-2.5 font-medium">Vehicle</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Operator</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Model</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Year</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Sightings</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Last seen</th>
              <th scope="col" className="px-3 py-2.5"><span className="sr-only">Open</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {vehicles.map((vehicle) => {
              const coverUrl = vehicle.cover_storage_path
                ? coverUrls[vehicle.cover_storage_path]
                : undefined;
              return (
                <tr key={vehicle.id} className="group transition-colors hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <Link
                      href={`/fleet/${vehicle.id}`}
                      className="flex items-center gap-2.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <span className="photo-frame block h-9 w-12 shrink-0 rounded border border-border">
                        <PhotoImage
                          src={coverUrl}
                          alt=""
                          className="h-full w-full"
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-mono text-[13px] font-semibold text-foreground group-hover:text-primary">
                          {vehicle.fleet_number ? `#${vehicle.fleet_number}` : "—"}
                        </span>
                        <span className="block truncate text-[10.5px] text-muted-foreground">
                          {vehicle.generation ?? vehicle.vehicle_category ?? "No notes"}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="max-w-[150px] truncate px-3 py-2 text-[12px] text-muted-foreground">
                    {vehicle.operator_name ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-[12px]">
                    <span className="block truncate font-medium text-foreground">
                      {vehicle.model ?? "—"}
                    </span>
                    <span className="block truncate text-[10.5px] text-muted-foreground">
                      {[vehicle.manufacturer, formatLength(vehicle.length_m, units)]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-[11.5px] text-muted-foreground">
                    {vehicle.model_year ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={vehicle.status} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="tabular text-[12px] text-foreground">{vehicle.sighting_count}</span>
                    {vehicle.photo_count > 0 ? (
                      <span className="ml-1 inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <ImagesIcon className="size-2.5" />
                        {vehicle.photo_count}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-muted-foreground">
                    {vehicle.last_spotted_at
                      ? formatDate(vehicle.last_spotted_at, dateStyle, timeZone)
                      : "Never"}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <Link
                      href={`/fleet/${vehicle.id}`}
                      aria-label={`Open fleet ${vehicle.fleet_number ?? "vehicle"}`}
                      className="inline-grid size-7 place-items-center rounded text-muted-foreground transition-colors group-hover:bg-muted group-hover:text-foreground"
                    >
                      <ChevronRightIcon className="size-3.5" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border/70 md:hidden">
        {vehicles.map((vehicle) => {
          const coverUrl = vehicle.cover_storage_path
            ? coverUrls[vehicle.cover_storage_path]
            : undefined;
          return (
            <li key={vehicle.id}>
              <Link
                href={`/fleet/${vehicle.id}`}
                className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/30 focus-visible:bg-muted/30 focus-visible:outline-none"
              >
                <span className="photo-frame block h-12 w-16 shrink-0 rounded border border-border">
                  <PhotoImage src={coverUrl} alt="" className="h-full w-full" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="font-mono text-[13px] font-semibold text-foreground">
                      {vehicle.fleet_number ? `#${vehicle.fleet_number}` : "—"}
                    </span>
                    <StatusBadge status={vehicle.status} />
                  </span>
                  <span className="mt-0.5 block truncate text-[11.5px] text-muted-foreground">
                    {[vehicle.operator_name, vehicle.model].filter(Boolean).join(" · ") ||
                      "No operator or model"}
                  </span>
                  <span className="mt-0.5 block text-[10.5px] text-muted-foreground">
                    {vehicle.sighting_count} sighting
                    {vehicle.sighting_count === 1 ? "" : "s"}
                    {vehicle.last_spotted_at
                      ? ` · last ${formatDate(vehicle.last_spotted_at, dateStyle, timeZone)}`
                      : ""}
                  </span>
                </span>
                <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
