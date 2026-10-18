"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ExternalLinkIcon,
  LoaderCircleIcon,
  MoreHorizontalIcon,
  StarIcon,
  TrashIcon,
} from "lucide-react";
import { toast } from "sonner";
import { setVehicleCover } from "@/lib/actions/vehicles";
import type { DateStyle, TimeFormat } from "@/lib/db/database.types";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PhotoLightbox,
  buildLightboxPhotos,
} from "@/components/photos/photo-lightbox";

export type VehiclePhoto = {
  id: string;
  url: string | null;
  caption: string | null;
  altText: string | null;
  filename: string;
  width: number | null;
  height: number | null;
  spottedAt: string;
  route: string | null;
  locationName: string | null;
  sightingId: string;
  fleetNumber: string | null;
  operatorName: string | null;
};

export function VehiclePhotoWall({
  vehicleId,
  coverPhotoId,
  photos,
  timeZone,
  dateStyle,
  timeFormat,
}: {
  vehicleId: string;
  coverPhotoId: string | null;
  photos: VehiclePhoto[];
  timeZone: string;
  dateStyle: DateStyle;
  timeFormat: TimeFormat;
}) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  const lightboxPhotos = useMemo(
    () =>
      buildLightboxPhotos(
        photos.map((photo) => ({
          id: photo.id,
          url: photo.url,
          caption: photo.caption,
          altText: photo.altText,
          filename: photo.filename,
          width: photo.width,
          height: photo.height,
          dateLabel: formatDateTime(photo.spottedAt, dateStyle, timeFormat, timeZone),
          route: photo.route,
          location: photo.locationName,
          operatorName: photo.operatorName,
          fleetNumber: photo.fleetNumber,
          sightingId: photo.sightingId,
          vehicleId,
        })),
      ),
    [photos, dateStyle, timeFormat, timeZone, vehicleId],
  );

  function chooseCover(photoId: string | null) {
    startTransition(async () => {
      const result = await setVehicleCover(vehicleId, { photo_id: photoId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(photoId ? "Vehicle cover updated." : "Vehicle cover cleared.");
      router.refresh();
    });
  }

  if (photos.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/20 px-5 py-8 text-center">
        <p className="text-[13px] font-medium text-foreground">No photographs yet</p>
        <p className="mx-auto mt-1 max-w-sm text-[11.5px] leading-relaxed text-muted-foreground">
          Photographs are attached to sightings. Record a sighting for this vehicle and
          upload the images there — they will appear in this wall automatically.
        </p>
        <Button asChild size="sm" className="mt-3">
          <Link href={`/sightings/new?vehicle=${vehicleId}`}>Record a sighting</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="group relative overflow-hidden rounded-md border border-border bg-muted"
          >
            <button
              type="button"
              onClick={() => setActiveIndex(index)}
              className="block aspect-[4/3] w-full focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring focus-visible:outline-none"
              aria-label={photo.caption || `Open photograph ${index + 1}`}
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

            {photo.id === coverPhotoId ? (
              <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-white uppercase">
                <StarIcon className="size-2.5 fill-current" />
                Vehicle cover
              </span>
            ) : null}

            <div className="absolute top-1.5 right-1.5">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="grid size-7 place-items-center rounded bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none data-[state=open]:opacity-100"
                    aria-label="Photograph actions"
                  >
                    {pending ? (
                      <LoaderCircleIcon className="size-3.5 animate-spin" />
                    ) : (
                      <MoreHorizontalIcon className="size-3.5" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-50">
                  <DropdownMenuItem
                    disabled={photo.id === coverPhotoId || pending}
                    onSelect={() => chooseCover(photo.id)}
                  >
                    <StarIcon />
                    {photo.id === coverPhotoId ? "Current vehicle cover" : "Use as vehicle cover"}
                  </DropdownMenuItem>
                  {coverPhotoId ? (
                    <DropdownMenuItem
                      disabled={pending}
                      onSelect={() => chooseCover(null)}
                    >
                      <TrashIcon />
                      Clear vehicle cover
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/sightings/${photo.sightingId}`}>
                      <ExternalLinkIcon />
                      Open sighting
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href={`/api/photos/${photo.id}/download`} target="_blank" rel="noreferrer">
                      <ExternalLinkIcon />
                      Download original
                    </a>
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

      <PhotoLightbox
        photos={lightboxPhotos}
        index={activeIndex}
        onIndexChange={setActiveIndex}
        onClose={() => setActiveIndex(null)}
      />
    </div>
  );
}
