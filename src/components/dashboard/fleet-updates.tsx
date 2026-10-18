import Link from "next/link";
import type { VehicleOverview } from "@/lib/db/database.types";
import type { DateStyle } from "@/lib/db/database.types";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/vehicles/status-badge";

export function FleetUpdates({
  vehicles,
  timeZone,
  dateStyle,
}: {
  vehicles: VehicleOverview[];
  timeZone: string;
  dateStyle: DateStyle;
}) {
  if (vehicles.length === 0) {
    return (
      <p className="py-4 text-center text-[12px] text-muted-foreground">
        No fleet records yet.
      </p>
    );
  }

  return (
    <ul className="space-y-1">
      {vehicles.map((vehicle) => (
        <li key={vehicle.id}>
          <Link
            href={`/fleet/${vehicle.id}`}
            className="group flex items-center justify-between gap-2 rounded py-1.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <span className="min-w-0">
              <span className="block truncate text-[12.5px] font-medium text-foreground group-hover:text-primary">
                <span className="font-mono">
                  {vehicle.fleet_number ? `#${vehicle.fleet_number}` : "—"}
                </span>
                <span className="ml-2 font-normal text-muted-foreground">
                  {vehicle.model ?? "Unknown model"}
                </span>
              </span>
              <span className="block truncate text-[10.5px] text-muted-foreground">
                Updated {formatDate(vehicle.updated_at, dateStyle, timeZone)}
              </span>
            </span>
            <StatusBadge status={vehicle.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
