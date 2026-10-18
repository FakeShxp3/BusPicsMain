"use client";

import Link from "next/link";
import {
  CalendarIcon,
  CameraIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  ExternalLinkIcon,
  MapPinIcon,
  RouteIcon,
  XIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type LightboxPhoto = {
  id: string;
  url: string | null;
  caption: string | null;
  alt: string;
  filename: string;
  width: number | null;
  height: number | null;
  dateLabel?: string;
  route?: string | null;
  location?: string | null;
  operatorName?: string | null;
  fleetNumber?: string | null;
  sightingId?: string;
  vehicleId?: string;
};

export function PhotoLightbox({
  photos,
  index,
  onIndexChange,
  onClose,
}: {
  photos: LightboxPhoto[];
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const open = index !== null && photos.length > 0;
  const photo = index !== null ? photos[index] : undefined;

  function move(delta: number) {
    if (index === null) return;
    const next = (index + delta + photos.length) % photos.length;
    onIndexChange(next);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-h-[94dvh] w-[calc(100%-1.5rem)] max-w-6xl gap-0 overflow-hidden p-0"
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            move(-1);
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            move(1);
          }
        }}
      >
        <DialogTitle className="sr-only">
          {photo?.caption || photo?.alt || "Photograph"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Use the left and right arrow keys to browse the archive. Press Escape to
          close.
        </DialogDescription>

        {photo ? (
          <div className="grid max-h-[94dvh] grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_300px] lg:overflow-hidden">
            <div className="relative flex min-h-[280px] items-center justify-center bg-[#080d16] lg:min-h-[600px]">
              {photo.url ? (
                <img
                  src={photo.url}
                  alt={photo.alt}
                  className="max-h-[58dvh] w-auto max-w-full object-contain lg:max-h-[90dvh]"
                />
              ) : (
                <p className="px-6 py-16 text-center text-sm text-white/60">
                  This photograph could not be loaded. It may have been removed from
                  storage.
                </p>
              )}

              <button
                type="button"
                onClick={onClose}
                className="absolute top-3 right-3 grid size-8 place-items-center rounded-md bg-black/50 text-white/80 transition-colors hover:bg-black/70 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none lg:hidden"
                aria-label="Close photograph"
              >
                <XIcon className="size-4" />
              </button>

              {photos.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => move(-1)}
                    className="absolute top-1/2 left-2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white/85 transition-colors hover:bg-black/70 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                    aria-label="Previous photograph"
                  >
                    <ChevronLeftIcon className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(1)}
                    className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white/85 transition-colors hover:bg-black/70 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                    aria-label="Next photograph"
                  >
                    <ChevronRightIcon className="size-5" />
                  </button>
                  <span className="absolute right-3 bottom-3 rounded bg-black/55 px-1.5 py-0.5 font-mono text-[10px] text-white/80">
                    {(index ?? 0) + 1} / {photos.length}
                  </span>
                </>
              ) : null}
            </div>

            <aside className="flex flex-col gap-4 border-t border-border bg-card p-4 lg:border-t-0 lg:border-l">
              <div className="hidden items-center justify-between gap-2 lg:flex">
                <p className="eyebrow">Archive photograph</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="grid size-7 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  aria-label="Close photograph"
                >
                  <XIcon className="size-4" />
                </button>
              </div>

              <div className="min-w-0 space-y-1.5">
                <p className="font-mono text-sm font-semibold text-foreground">
                  {photo.fleetNumber ? `#${photo.fleetNumber}` : "Unnumbered vehicle"}
                </p>
                <p className="text-[12px] text-muted-foreground">
                  {photo.operatorName ?? "No operator"}
                </p>
                {photo.caption ? (
                  <p className="pt-1 text-[13px] leading-relaxed text-foreground">
                    {photo.caption}
                  </p>
                ) : null}
              </div>

              <dl className="space-y-2.5 border-t border-border/70 pt-3 text-[12px]">
                {photo.dateLabel ? (
                  <div className="flex gap-2">
                    <CalendarIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <div>
                      <dt className="sr-only">Captured</dt>
                      <dd className="text-foreground">{photo.dateLabel}</dd>
                    </div>
                  </div>
                ) : null}
                {photo.route ? (
                  <div className="flex gap-2">
                    <RouteIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <div>
                      <dt className="sr-only">Route</dt>
                      <dd className="text-foreground">Route {photo.route}</dd>
                    </div>
                  </div>
                ) : null}
                {photo.location ? (
                  <div className="flex gap-2">
                    <MapPinIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <div>
                      <dt className="sr-only">Location</dt>
                      <dd className="text-foreground">{photo.location}</dd>
                    </div>
                  </div>
                ) : null}
                <div className="flex gap-2">
                  <CameraIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <dt className="sr-only">File</dt>
                    <dd className="break-all text-muted-foreground">
                      {photo.filename}
                      {photo.width && photo.height
                        ? ` · ${photo.width}×${photo.height}`
                        : ""}
                    </dd>
                  </div>
                </div>
              </dl>

              <div className="mt-auto flex flex-col gap-2 border-t border-border/70 pt-3">
                <Button asChild variant="outline" size="sm" className="justify-start">
                  <a href={`/api/photos/${photo.id}/download`} target="_blank" rel="noreferrer">
                    <DownloadIcon />
                    Download original
                  </a>
                </Button>
                {photo.sightingId ? (
                  <Button asChild variant="ghost" size="sm" className="justify-start">
                    <Link href={`/sightings/${photo.sightingId}`}>
                      <ExternalLinkIcon />
                      Open sighting
                    </Link>
                  </Button>
                ) : null}
                {photo.vehicleId ? (
                  <Button asChild variant="ghost" size="sm" className="justify-start">
                    <Link href={`/fleet/${photo.vehicleId}`}>
                      <ExternalLinkIcon />
                      Open vehicle
                    </Link>
                  </Button>
                ) : null}
              </div>
            </aside>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function buildLightboxPhotos(
  photos: Array<{
    id: string;
    url: string | null;
    caption: string | null;
    altText: string | null;
    filename: string;
    width: number | null;
    height: number | null;
    dateLabel?: string;
    route?: string | null;
    location?: string | null;
    operatorName?: string | null;
    fleetNumber?: string | null;
    sightingId?: string;
    vehicleId?: string;
  }>,
): LightboxPhoto[] {
  return photos.map((photo) => ({
    id: photo.id,
    url: photo.url,
    caption: photo.caption,
    alt:
      photo.altText ||
      photo.caption ||
      `Photograph of fleet ${photo.fleetNumber ?? "vehicle"}`,
    filename: photo.filename,
    width: photo.width,
    height: photo.height,
    dateLabel: photo.dateLabel,
    route: photo.route,
    location: photo.location,
    operatorName: photo.operatorName,
    fleetNumber: photo.fleetNumber,
    sightingId: photo.sightingId,
    vehicleId: photo.vehicleId,
  }));
}
