import type { VehicleStatus } from "@/lib/db/database.types";
import { VEHICLE_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const STATUS_VARIANT: Record<
  VehicleStatus,
  "success" | "warning" | "destructive" | "info" | "secondary"
> = {
  active: "success",
  retired: "warning",
  scrapped: "destructive",
  transferred: "info",
  unknown: "secondary",
};

export function StatusBadge({
  status,
  className,
  withDot = true,
}: {
  status: VehicleStatus;
  className?: string;
  withDot?: boolean;
}) {
  return (
    <Badge variant={STATUS_VARIANT[status]} className={cn("font-sans", className)}>
      {withDot ? <span className="size-1.5 rounded-full bg-current opacity-80" aria-hidden="true" /> : null}
      {VEHICLE_STATUS_LABELS[status]}
    </Badge>
  );
}
