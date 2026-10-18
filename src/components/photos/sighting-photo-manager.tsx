"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CameraIcon,
  LoaderCircleIcon,
  MoreHorizontalIcon,
  PencilIcon,
  StarIcon,
  TrashIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  deletePhoto,
  reorderPhotos,
  setPhotoCover,
  updatePhotoMetadata,
} from "@/lib/actions/photos";
import type { DateStyle, TimeFormat } from "@/lib/db/database.types";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PhotoUploader } from "@/components/photos/photo-uploader";
import {
  PhotoLightbox,
  buildLightboxPhotos,
  type LightboxPhoto,
} from "@/components/photos/photo-lightbox";

export type ManagedPhoto = {
  id: string;
  url: string | null;
  caption: string | null;
  altText: string | null;
  filename: string;
  width: number | null;
  height: number | null;
  isCover: boolean;
  sortOrder: number;
};

type PhotoMeta = {
  fleetNumber: string | null;
  operatorName: string | null;
  route: string | null;
  locationName: string | null;
  spottedAt: string;
  vehicleId: string;
};

export function SightingPhotoManager({
  sightingId,
  userId,
  photos,
  meta,
  remainingSlots,
  timeZone,
  dateStyle,
  timeFormat,
}: {
  sightingId: string;
  userId: string;
  photos: ManagedPhoto[];
  meta: PhotoMeta;
  remainingSlots: number;
  timeZone: string;
  dateStyle: DateStyle;
  timeFormat: TimeFormat;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [editing, setEditing] = useState<ManagedPhoto | null>(null);
  const [deleting, setDeleting] = useState<ManagedPhoto | null>(null);
  const [caption, setCaption] = useState("");
  const [altText, setAltText] = useState("");
  const [dialogError, setDialogError] = useState<string | null>(null);

  const ordered = useMemo(
    () => [...photos].sort((a, b) => a.sortOrder - b.sortOrder),
    [photos],
  );

  useEffect(() => {
    if (activeIndex !== null && activeIndex >= ordered.length) {
      setActiveIndex(ordered.length > 0 ? ordered.length - 1 : null);
    }
  }, [activeIndex, ordered.length]);

  const lightboxPhotos: LightboxPhoto[] = useMemo(
    () =>
      buildLightboxPhotos(
        ordered.map((photo) => ({
          id: photo.id,
          url: photo.url,
          caption: photo.caption,
          altText: photo.altText,
          filename: photo.filename,
          width: photo.width,
          height: photo.height,
          dateLabel: formatDateTime(
            meta.spottedAt,
            dateStyle,
            timeFormat,
            timeZone,
          ),
          route: meta.route,
          location: meta.locationName,
          operatorName: meta.operatorName,
          fleetNumber: meta.fleetNumber,
          sightingId,
          vehicleId: meta.vehicleId,
        })),
      ),
    [ordered, meta, timeZone, dateStyle, timeFormat, sightingId],
  );

  function beginEdit(photo: ManagedPhoto) {
    setEditing(photo);
    setCaption(photo.caption ?? "");
    setAltText(photo.altText ?? "");
    setDialogError(null);
  }

  function saveMetadata() {
    if (!editing) return;
    startTransition(async () => {
      const result = await updatePhotoMetadata(editing.id, {
        caption,
        alt_text: altText,
      });
      if (!result.ok) {
        setDialogError(result.error);
        return;
      }
      setEditing(null);
      toast.success("Photograph details saved.");
      router.refresh();
    });
  }

  function makeCover(photo: ManagedPhoto) {
    startTransition(async () => {
      const result = await setPhotoCover(photo.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Cover photograph updated.");
      router.refresh();
    });
  }

  function confirmDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deletePhoto(deleting.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDeleting(null);
      if (result.data.warning) toast.warning(result.data.warning);
      else toast.success("Photograph deleted.");
      router.refresh();
    });
  }

  function move(photo: ManagedPhoto, direction: -1 | 1) {
    const index = ordered.findIndex((entry) => entry.id === photo.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    const ids = ordered.map((entry) => entry.id);
    const [moved] = ids.splice(index, 1);
    if (!moved) return;
    ids.splice(target, 0, moved);
    startTransition(async () => {
      const result = await reorderPhotos({ sighting_id: sightingId, photo_ids: ids });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Photograph order updated.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CameraIcon className="size-3.5 text-muted-foreground" />
          <h2 className="text-[13.5px] font-semibold tracking-tight">
            Photographs
            <span className="ml-1.5 font-normal text-muted-foreground">
              {ordered.length}
            </span>
          </h2>
        </div>
        {ordered.length > 0 ? (
          <p className="text-[11px] text-muted-foreground">
            Cover, captions, ordering and deletions are managed here.
          </p>
        ) : null}
      </div>

      {ordered.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ordered.map((photo, index) => (
            <div
              key={photo.id}
              className="group relative overflow-hidden rounded-md border border-border bg-muted"
            >
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                className="block aspect-[4/3] w-full focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring focus-visible:outline-none"
                aria-label={`Open ${photo.caption || photo.filename}`}
              >
                {photo.url ? (
                  <img
                    src={photo.url}
                    alt={photo.altText || photo.caption || "Vehicle photograph"}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                ) : (
                  <span className="grid h-full w-full place-items-center text-[11px] text-muted-foreground">
                    Image unavailable
                  </span>
                )}
              </button>

              {photo.isCover ? (
                <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-white uppercase">
                  <StarIcon className="size-2.5 fill-current" />
                  Cover
                </span>
              ) : null}

              <div className="absolute top-1.5 right-1.5">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="grid size-7 place-items-center rounded bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none data-[state=open]:opacity-100"
                      aria-label={`Actions for ${photo.filename}`}
                    >
                      {pending ? (
                        <LoaderCircleIcon className="size-3.5 animate-spin" />
                      ) : (
                        <MoreHorizontalIcon className="size-3.5" />
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onSelect={() => beginEdit(photo)}>
                      <PencilIcon />
                      Caption & alt text
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => makeCover(photo)}
                      disabled={photo.isCover || pending}
                    >
                      <StarIcon />
                      {photo.isCover ? "Already the cover" : "Set as cover"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => move(photo, -1)}
                      disabled={index === 0 || pending}
                    >
                      <ArrowLeftIcon />
                      Move earlier
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => move(photo, 1)}
                      disabled={index === ordered.length - 1 || pending}
                    >
                      <ArrowRightIcon />
                      Move later
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => setDeleting(photo)}
                    >
                      <TrashIcon />
                      Delete photograph
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {photo.caption ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <p className="truncate text-[10.5px] text-white/90">{photo.caption}</p>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-border bg-muted/20 px-5 py-8 text-center">
          <p className="text-[13px] font-medium text-foreground">No photographs yet</p>
          <p className="mx-auto mt-1 max-w-sm text-[11.5px] leading-relaxed text-muted-foreground">
            The sighting is complete without a photo, but adding one now keeps the
            archive rich. Captions can be added afterwards.
          </p>
        </div>
      )}

      <PhotoUploader
        sightingId={sightingId}
        userId={userId}
        remainingSlots={remainingSlots}
      />

      <PhotoLightbox
        photos={lightboxPhotos}
        index={activeIndex}
        onIndexChange={setActiveIndex}
        onClose={() => setActiveIndex(null)}
      />

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Photograph details</DialogTitle>
            <DialogDescription>
              Captions appear in the gallery and lightbox. Alt text describes the
              image for screen readers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="photo-caption">Caption</Label>
              <Input
                id="photo-caption"
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                maxLength={500}
                placeholder="e.g. Pulling out of the loop at Commercial–Broadway"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="photo-alt">Alt text</Label>
              <Textarea
                id="photo-alt"
                value={altText}
                onChange={(event) => setAltText(event.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Describe the photograph for someone who cannot see it"
              />
            </div>
            {dialogError ? (
              <p className="text-[12px] text-destructive">{dialogError}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditing(null)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="button" onClick={saveMetadata} disabled={pending}>
              {pending ? <LoaderCircleIcon className="animate-spin" /> : null}
              Save details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this photograph?</AlertDialogTitle>
            <AlertDialogDescription>
              The image file and its caption will be permanently removed. The
              sighting itself is kept. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Keep photograph</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                confirmDelete();
              }}
              disabled={pending}
              className={cn(pending && "opacity-70")}
            >
              {pending ? <LoaderCircleIcon className="animate-spin" /> : null}
              Delete photograph
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
