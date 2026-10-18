"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircleIcon, TrashIcon } from "lucide-react";
import { toast } from "sonner";
import { deleteSightings } from "@/lib/actions/sightings";
import { Button } from "@/components/ui/button";
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

export function SightingDetailActions({
  sightingId,
  fleetNumber,
  spottedLabel,
  photoCount,
}: {
  sightingId: string;
  fleetNumber: string | null;
  spottedLabel: string;
  photoCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const result = await deleteSightings([sightingId]);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Sighting deleted.");
      router.push("/sightings");
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <TrashIcon />
        Delete
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete this sighting{fleetNumber ? ` of fleet #${fleetNumber}` : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {spottedLabel}.{" "}
              {photoCount > 0
                ? `${photoCount} photograph${photoCount === 1 ? "" : "s"} and their image files will be permanently removed. `
                : "No photographs are attached. "}
              The vehicle record is kept. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Keep sighting</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                remove();
              }}
              disabled={pending}
            >
              {pending ? <LoaderCircleIcon className="animate-spin" /> : <TrashIcon />}
              Delete sighting
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
