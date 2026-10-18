"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LoaderCircleIcon,
  Settings2Icon,
  TrashIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { toast } from "sonner";
import { changeVehicleStatus, deleteVehicle } from "@/lib/actions/vehicles";
import type { VehicleStatus } from "@/lib/db/database.types";
import {
  VEHICLE_STATUSES,
  VEHICLE_STATUS_HINTS,
  VEHICLE_STATUS_LABELS,
} from "@/lib/constants";
import { formatDateOnly } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function todayLocalDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function VehicleStatusActions({
  vehicleId,
  fleetNumber,
  status,
  statusVerifiedOn,
  sightingCount,
  photoCount,
}: {
  vehicleId: string;
  fleetNumber: string | null;
  status: VehicleStatus;
  statusVerifiedOn: string | null;
  sightingCount: number;
  photoCount: number;
}) {
  const router = useRouter();
  const [statusOpen, setStatusOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<VehicleStatus>(status);
  const [changedOn, setChangedOn] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setChangedOn(todayLocalDate());
  }, []);

  useEffect(() => {
    if (statusOpen) {
      setNextStatus(status);
      setNotes("");
      setError(null);
      setChangedOn(todayLocalDate());
    }
  }, [statusOpen, status]);

  function saveStatus() {
    setError(null);
    startTransition(async () => {
      const result = await changeVehicleStatus(vehicleId, {
        status: nextStatus,
        changed_on: changedOn || null,
        notes,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(
        `Status recorded as ${VEHICLE_STATUS_LABELS[nextStatus]}. The change is in the vehicle's history.`,
      );
      setStatusOpen(false);
      router.refresh();
    });
  }

  function confirmDelete() {
    startTransition(async () => {
      const result = await deleteVehicle(vehicleId);
      if (!result.ok) {
        setError(result.error);
        setDeleteOpen(false);
        toast.error(result.error);
        return;
      }
      toast.success(
        `Vehicle ${fleetNumber ? `#${fleetNumber}` : ""} deleted with ${result.data.deletedSightings} sighting(s).`,
      );
      router.push("/fleet");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <Settings2Icon />
            Update status
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record a status change</DialogTitle>
            <DialogDescription>
              Status is manually maintained by you. Each change is appended to the
              vehicle&apos;s history with its date and note.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="status-value">New status</Label>
              <Select
                value={nextStatus}
                onValueChange={(value) => setNextStatus(value as VehicleStatus)}
              >
                <SelectTrigger id="status-value">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_STATUSES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {VEHICLE_STATUS_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                {VEHICLE_STATUS_HINTS[nextStatus]}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status-date">Status applies from</Label>
              <Input
                id="status-date"
                type="date"
                value={changedOn}
                onChange={(event) => setChangedOn(event.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Current record: {VEHICLE_STATUS_LABELS[status]}
                {statusVerifiedOn
                  ? ` · verified ${formatDateOnly(statusVerifiedOn)}`
                  : ""}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status-notes">Note (optional)</Label>
              <Textarea
                id="status-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                maxLength={5000}
                placeholder="e.g. Withdrawn after service on route 49"
              />
            </div>

            {error ? <p className="text-[12px] text-destructive">{error}</p> : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setStatusOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="button" onClick={saveStatus} disabled={pending}>
              {pending ? <LoaderCircleIcon className="animate-spin" /> : null}
              Record status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete vehicle {fleetNumber ? `#${fleetNumber}` : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-[13px] leading-relaxed text-muted-foreground">
                <p>
                  This permanently removes the vehicle, its status history and{" "}
                  <span className="font-medium text-foreground">
                    {sightingCount} sighting{sightingCount === 1 ? "" : "s"}
                  </span>{" "}
                  with{" "}
                  <span className="font-medium text-foreground">
                    {photoCount} photograph{photoCount === 1 ? "" : "s"}
                  </span>
                  .
                </p>
                <p className="flex items-start gap-1.5 rounded border border-destructive/25 bg-destructive/10 px-2 py-1.5 text-destructive">
                  <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
                  Image files are removed from storage too. This cannot be undone.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Keep vehicle</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                confirmDelete();
              }}
              disabled={pending}
            >
              {pending ? <LoaderCircleIcon className="animate-spin" /> : <TrashIcon />}
              Delete vehicle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-destructive"
        onClick={() => setDeleteOpen(true)}
      >
        <TrashIcon />
        <span className="hidden sm:inline">Delete</span>
      </Button>

      <Link href="/settings#exports" className="sr-only">
        Export data
      </Link>
    </div>
  );
}
