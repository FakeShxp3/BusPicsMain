"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CameraIcon,
  ExternalLinkIcon,
  ImageOffIcon,
  LoaderCircleIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  RouteIcon,
  TrashIcon,
} from "lucide-react";
import { toast } from "sonner";
import { deleteSightings } from "@/lib/actions/sightings";
import type { SightingOverview } from "@/lib/db/database.types";
import type { DateStyle, TimeFormat } from "@/lib/db/database.types";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { PhotoImage } from "@/components/common/photo-image";

export function SightingsCollection({
  sightings,
  coverUrls,
  view,
  timeZone,
  dateStyle,
  timeFormat,
}: {
  sightings: SightingOverview[];
  coverUrls: Record<string, string>;
  view: "list" | "gallery";
  timeZone: string;
  dateStyle: DateStyle;
  timeFormat: TimeFormat;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<{ ids: string[]; label: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const allSelected = selected.size > 0 && selected.size === sightings.length;

  const labels = useMemo(() => {
    const map = new Map<string, string>();
    for (const sighting of sightings) {
      map.set(
        sighting.id,
        `${sighting.fleet_number ? `fleet ${sighting.fleet_number}` : "vehicle"} on ${formatDateTime(
          sighting.spotted_at,
          dateStyle,
          timeFormat,
          timeZone,
        )}`,
      );
    }
    return map;
  }, [sightings, dateStyle, timeFormat, timeZone]);

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= 50) {
          toast.error("Select up to 50 sightings at a time.");
          return current;
        }
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(sightings.map((row) => row.id)));
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteSightings(deleteTarget.ids);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDeleteTarget(null);
      setSelected(new Set());
      if (result.data.storageFailures > 0) {
        toast.warning(
          `${result.data.deleted} sighting(s) deleted, but ${result.data.storageFailures} image file(s) could not be removed from storage.`,
        );
      } else {
        toast.success(
          `${result.data.deleted} sighting${result.data.deleted === 1 ? "" : "s"} deleted.`,
        );
      }
      router.refresh();
    });
  }

  const selectionBar =
    selected.size > 0 ? (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/25 bg-primary/5 px-3 py-2">
        <p className="text-[12px] text-foreground">
          <span className="font-mono">{selected.size}</span> selected
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSelected(new Set())}
            disabled={pending}
          >
            Clear
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() =>
              setDeleteTarget({
                ids: Array.from(selected),
                label: `${selected.size} selected sighting${selected.size === 1 ? "" : "s"}`,
              })
            }
            disabled={pending}
          >
            <TrashIcon />
            Delete selected
          </Button>
        </div>
      </div>
    ) : null;

  return (
    <div className="space-y-3">
      {selectionBar}

      {view === "list" ? (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-3 py-2">
            <Checkbox
              checked={allSelected ? true : selected.size > 0 ? "indeterminate" : false}
              onCheckedChange={toggleAll}
              aria-label="Select all sightings on this page"
            />
            <span className="text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
              {selected.size > 0
                ? `${selected.size} selected`
                : `${sightings.length} sighting${sightings.length === 1 ? "" : "s"} on this page`}
            </span>
            <Link
              href="/sightings/new"
              className="ml-auto inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
            >
              <PlusIcon className="size-3" />
              Add sighting
            </Link>
          </div>

          <ul className="divide-y divide-border/70">
            {sightings.map((sighting) => {
              const coverUrl = sighting.cover_storage_path
                ? coverUrls[sighting.cover_storage_path]
                : undefined;
              return (
                <li
                  key={sighting.id}
                  className={cn(
                    "group flex items-start gap-3 px-3 py-3 transition-colors hover:bg-muted/30",
                    selected.has(sighting.id) && "bg-primary/[0.04]",
                  )}
                >
                  <Checkbox
                    className="mt-1"
                    checked={selected.has(sighting.id)}
                    onCheckedChange={() => toggle(sighting.id)}
                    aria-label={`Select ${labels.get(sighting.id)}`}
                  />

                  <Link
                    href={`/sightings/${sighting.id}`}
                    className="photo-frame block h-14 w-20 shrink-0 rounded border border-border"
                    aria-label={`Open sighting of ${labels.get(sighting.id)}`}
                  >
                    {coverUrl ? (
                      <PhotoImage src={coverUrl} alt="" className="h-full w-full" />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-muted-foreground/50">
                        <ImageOffIcon className="size-4" />
                      </span>
                    )}
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <Link
                        href={`/sightings/${sighting.id}`}
                        className="font-mono text-[13px] font-semibold text-foreground hover:text-primary"
                      >
                        {sighting.fleet_number ? `#${sighting.fleet_number}` : "Unnumbered"}
                      </Link>
                      <span className="truncate text-[11.5px] text-muted-foreground">
                        {[sighting.operator_name, sighting.model].filter(Boolean).join(" · ") ||
                          "No operator or model"}
                      </span>
                      {sighting.route ? (
                        <Badge variant="mono" className="gap-1">
                          <RouteIcon className="size-2.5" />
                          {sighting.route}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {formatDateTime(
                        sighting.spotted_at,
                        dateStyle,
                        timeFormat,
                        timeZone,
                      )}
                      {sighting.location_name ? ` · ${sighting.location_name}` : ""}
                      {sighting.direction ? ` · ${sighting.direction}` : ""}
                    </p>
                    {sighting.notes ? (
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground/80 italic">
                        {sighting.notes}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="hidden items-center gap-1 text-[10px] text-muted-foreground sm:inline-flex">
                      <CameraIcon className="size-3" />
                      {sighting.photo_count}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Actions for ${labels.get(sighting.id)}`}
                          className="opacity-70 group-hover:opacity-100"
                        >
                          {pending ? (
                            <LoaderCircleIcon className="animate-spin" />
                          ) : (
                            <MoreHorizontalIcon />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem asChild>
                          <Link href={`/sightings/${sighting.id}`}>
                            <ExternalLinkIcon />
                            Open sighting
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/fleet/${sighting.vehicle_id}`}>
                            <CameraIcon />
                            Open vehicle
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/sightings/${sighting.id}/edit`}>
                            <PencilIcon />
                            Edit sighting
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() =>
                            setDeleteTarget({
                              ids: [sighting.id],
                              label: labels.get(sighting.id) ?? "this sighting",
                            })
                          }
                        >
                          <TrashIcon />
                          Delete sighting
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sightings.map((sighting) => {
            const coverUrl = sighting.cover_storage_path
              ? coverUrls[sighting.cover_storage_path]
              : undefined;
            const isSelected = selected.has(sighting.id);
            return (
              <div
                key={sighting.id}
                className={cn(
                  "group relative overflow-hidden rounded-lg border bg-card transition-colors",
                  isSelected ? "border-primary/50" : "border-border hover:border-primary/40",
                )}
              >
                <Link
                  href={`/sightings/${sighting.id}`}
                  className="photo-frame block aspect-[4/3] w-full"
                  aria-label={`Open ${labels.get(sighting.id)}`}
                >
                  <PhotoImage
                    src={coverUrl}
                    alt={`Sighting of ${sighting.fleet_number ? `fleet ${sighting.fleet_number}` : "a vehicle"}${sighting.location_name ? ` at ${sighting.location_name}` : ""}`}
                    className="h-full w-full"
                  />
                </Link>

                <div className="absolute top-2 left-2">
                  <span className="grid size-6 place-items-center rounded border border-white/30 bg-black/55">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggle(sighting.id)}
                      aria-label={`Select ${labels.get(sighting.id)}`}
                      className="border-white/60 bg-black/30 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                    />
                  </span>
                </div>

                {sighting.photo_count > 0 ? (
                  <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded border border-white/20 bg-black/55 px-1.5 py-0.5 text-[10px] text-white/90">
                    <CameraIcon className="size-2.5" />
                    {sighting.photo_count}
                  </span>
                ) : null}

                <div className="space-y-1 p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <Link
                      href={`/sightings/${sighting.id}`}
                      className="font-mono text-[13px] font-semibold text-foreground hover:text-primary"
                    >
                      {sighting.fleet_number ? `#${sighting.fleet_number}` : "Unnumbered"}
                    </Link>
                    {sighting.route ? (
                      <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {sighting.route}
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-[11.5px] text-muted-foreground">
                    {[sighting.operator_name, sighting.model].filter(Boolean).join(" · ") ||
                      "No operator or model"}
                  </p>
                  <p className="truncate text-[10.5px] text-muted-foreground">
                    {formatDateTime(
                      sighting.spotted_at,
                      dateStyle,
                      timeFormat,
                      timeZone,
                    )}
                    {sighting.location_name ? ` · ${sighting.location_name}` : ""}
                  </p>
                </div>

                <div className="absolute right-2 bottom-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon-sm"
                        aria-label={`Actions for ${labels.get(sighting.id)}`}
                      >
                        <MoreHorizontalIcon />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem asChild>
                        <Link href={`/sightings/${sighting.id}/edit`}>
                          <PencilIcon />
                          Edit sighting
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/fleet/${sighting.vehicle_id}`}>
                          <ExternalLinkIcon />
                          Open vehicle
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() =>
                          setDeleteTarget({
                            ids: [sighting.id],
                            label: labels.get(sighting.id) ?? "this sighting",
                          })
                        }
                      >
                        <TrashIcon />
                        Delete sighting
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              The sighting and its photographs will be permanently removed, including
              the image files in storage. The vehicle record is kept. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Keep sighting</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                confirmDelete();
              }}
              disabled={pending}
            >
              {pending ? <LoaderCircleIcon className="animate-spin" /> : <TrashIcon />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
