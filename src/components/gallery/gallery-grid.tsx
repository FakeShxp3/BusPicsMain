"use client";

import { useMemo, useState } from "react";
import { Maximize2Icon } from "lucide-react";
import type { GalleryDensity, DateStyle, TimeFormat } from "@/lib/db/database.types";
import { GALLERY_COLUMN_CLASSES } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  PhotoLightbox,
  buildLightboxPhotos,
} from "@/components/photos/photo-lightbox";

export type GalleryPhotoItem = {
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
  operatorName: string | null;
  fleetNumber: string | null;
  sightingId: string;
  vehicleId: string;
};

export function GalleryGrid({
  photos,
  density,
  timeZone,
  dateStyle,
  timeFormat,
}: {
  photos: GalleryPhotoItem[];
  density: GalleryDensity;
  timeZone: string;
  dateStyle: DateStyle;
  timeFormat: TimeFormat;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

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
          vehicleId: photo.vehicleId,
        })),
      ),
    [photos, timeZone, dateStyle, timeFormat],
  );

  return (
    <>
      <div className={cn("gap-2 [column-fill:_balance]", GALLERY_COLUMN_CLASSES[density])}>
        {photos.map((photo, index) => {
          const ratio =
            photo.width && photo.height
              ? `${photo.width} / ${photo.height}`
              : "4 / 3";
          return (
            <figure
              key={photo.id}
              className="group relative mb-2 break-inside-avoid overflow-hidden rounded-md border border-border bg-muted"
            >
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                className="block w-full focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring focus-visible:outline-none"
                style={{ aspectRatio: ratio }}
                aria-label={`Open photograph of ${photo.fleetNumber ? `fleet ${photo.fleetNumber}` : "a vehicle"}`}
              >
                {photo.url ? (
                  <img
                    src={photo.url}
                    alt={
                      photo.altText ||
                      photo.caption ||
                      `Photograph of ${photo.fleetNumber ? `fleet ${photo.fleetNumber}` : "a vehicle"}`
                    }
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.015]"
                  />
                ) : (
                  <span className="grid h-full w-full place-items-center text-[11px] text-muted-foreground">
                    Image unavailable
                  </span>
                )}
              </button>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-black/55 px-2 py-1">
                <span className="truncate font-mono text-[10px] font-medium text-white">
                  {photo.fleetNumber ? `#${photo.fleetNumber}` : "—"}
                  {photo.route ? (
                    <span className="ml-1.5 font-sans text-[9px] text-white/65">
                      route {photo.route}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-[9px] text-white/65">
                  {formatDateTime(photo.spottedAt, dateStyle, timeFormat, timeZone)}
                </span>
              </div>

              <span className="pointer-events-none absolute top-1.5 right-1.5 grid size-6 place-items-center rounded bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100">
                <Maximize2Icon className="size-3" />
              </span>
            </figure>
          );
        })}
      </div>

      <PhotoLightbox
        photos={lightboxPhotos}
        index={activeIndex}
        onIndexChange={setActiveIndex}
        onClose={() => setActiveIndex(null)}
      />
    </>
  );
}
