import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeftIcon,
  ApertureIcon,
  CameraIcon,
  ExternalLinkIcon,
  FocusIcon,
  GaugeIcon,
  MapPinIcon,
  PencilIcon,
  RouteIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/page-header";
import { PhotoImage } from "@/components/common/photo-image";
import { StatusBadge } from "@/components/vehicles/status-badge";
import { SightingPhotoManager } from "@/components/photos/sighting-photo-manager";
import { SightingDetailActions } from "@/components/sightings/sighting-detail-actions";
import { SightingsMap } from "@/components/map/sightings-map";
import { getSightingDetail, getSightingPhotos } from "@/lib/queries/sightings";
import { getSignedUrlMap } from "@/lib/photos-server";
import { getViewer } from "@/lib/supabase/server";
import {
  formatDateTime,
  formatFileSize,
  formatNumber,
} from "@/lib/format";
import { DEFAULT_MAP_CENTER, MAX_PHOTOS_PER_SIGHTING } from "@/lib/constants";
import type { MapSighting } from "@/lib/map-types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const metadata: Metadata = { title: "Sighting" };

export default async function SightingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) notFound();

  const viewer = await getViewer();
  const [sighting, photos] = await Promise.all([
    getSightingDetail(id),
    getSightingPhotos(id),
  ]);

  if (!sighting) notFound();

  const signed = await getSignedUrlMap(photos.map((photo) => photo.storage_path));
  const urls = Object.fromEntries(signed);

  const managedPhotos = photos.map((photo) => ({
    id: photo.id,
    url: urls[photo.storage_path] ?? null,
    caption: photo.caption,
    altText: photo.alt_text,
    filename: photo.original_filename,
    width: photo.width,
    height: photo.height,
    isCover: photo.is_cover,
    sortOrder: photo.sort_order,
    size: photo.file_size,
  }));

  const cover = managedPhotos.find((photo) => photo.isCover) ?? managedPhotos[0];
  const spottedLabel = formatDateTime(
    sighting.spotted_at,
    viewer.preferences.date_style,
    viewer.preferences.time_format,
    viewer.timeZone,
  );

  const mapDefaults = {
    latitude: viewer.preferences.map_center_lat ?? DEFAULT_MAP_CENTER.lat,
    longitude: viewer.preferences.map_center_lng ?? DEFAULT_MAP_CENTER.lng,
    zoom: viewer.preferences.map_zoom ?? DEFAULT_MAP_CENTER.zoom,
  };

  const mapPoint: MapSighting | null =
    sighting.latitude !== null && sighting.longitude !== null
      ? {
          id: sighting.id,
          sightingId: sighting.id,
          latitude: sighting.latitude,
          longitude: sighting.longitude,
          fleetNumber: sighting.fleet_number,
          dateLabel: spottedLabel,
          route: sighting.route,
          locationName: sighting.location_name,
          coverUrl: cover?.url ?? null,
          vehicleId: sighting.vehicle_id,
        }
      : null;

  const cameraRows = [
    { label: "Camera", value: sighting.camera_model, icon: CameraIcon },
    { label: "Lens", value: sighting.lens, icon: FocusIcon },
    { label: "Aperture", value: sighting.aperture, icon: ApertureIcon },
    { label: "Shutter", value: sighting.shutter_speed, icon: GaugeIcon },
    { label: "ISO", value: sighting.iso ? String(sighting.iso) : null, icon: GaugeIcon },
    { label: "Focal length", value: sighting.focal_length, icon: FocusIcon },
  ].filter((row) => row.value);

  return (
    <div className="space-y-6">
      <Link
        href="/sightings"
        className="inline-flex w-fit items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" />
        Sightings
      </Link>

      <PageHeader
        eyebrow={[sighting.operator_name ?? "No operator", sighting.vehicle_status]
          .filter(Boolean)
          .join(" · ")}
        title={
          sighting.fleet_number
            ? `Fleet #${sighting.fleet_number}`
            : sighting.model ?? "Vehicle sighting"
        }
        description={
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-mono text-[12px] text-foreground">{spottedLabel}</span>
            {sighting.route ? (
              <Badge variant="mono" className="gap-1">
                <RouteIcon className="size-2.5" />
                {sighting.route}
              </Badge>
            ) : null}
            {sighting.location_name ? (
              <span className="inline-flex items-center gap-1 text-[12px]">
                <MapPinIcon className="size-3" />
                {sighting.location_name}
              </span>
            ) : null}
          </span>
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/sightings/${sighting.id}/edit`}>
                <PencilIcon />
                Edit
              </Link>
            </Button>
            <SightingDetailActions
              sightingId={sighting.id}
              fleetNumber={sighting.fleet_number}
              spottedLabel={spottedLabel}
              photoCount={photos.length}
            />
          </>
        }
      />

      {cover?.url ? (
        <div className="photo-frame aspect-[21/9] max-h-[460px] overflow-hidden rounded-lg border border-border">
          <PhotoImage
            src={cover.url}
            alt={cover.altText || cover.caption || "Sighting photograph"}
            className="h-full w-full"
            imgClassName="object-cover"
            loading="eager"
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Photo archive</CardTitle>
              <CardDescription>
                Upload originals, choose the cover and caption each image.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SightingPhotoManager
                sightingId={sighting.id}
                userId={viewer.userId}
                photos={managedPhotos}
                remainingSlots={Math.max(0, MAX_PHOTOS_PER_SIGHTING - managedPhotos.length)}
                timeZone={viewer.timeZone}
                dateStyle={viewer.preferences.date_style}
                timeFormat={viewer.preferences.time_format}
                meta={{
                  fleetNumber: sighting.fleet_number,
                  operatorName: sighting.operator_name,
                  route: sighting.route,
                  locationName: sighting.location_name,
                  spottedAt: sighting.spotted_at,
                  vehicleId: sighting.vehicle_id,
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
              <CardDescription>
                Private to your account. Edit this sighting to change the text.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sighting.notes ? (
                <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap text-foreground">
                  {sighting.notes}
                </p>
              ) : (
                <p className="text-[11.5px] text-muted-foreground">
                  No notes recorded for this sighting.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-2">
              <div className="space-y-1">
                <CardTitle>Vehicle</CardTitle>
                <CardDescription>The record this sighting belongs to.</CardDescription>
              </div>
              <Link
                href={`/fleet/${sighting.vehicle_id}`}
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                Open <ExternalLinkIcon className="size-3" />
              </Link>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3">
                <Link
                  href={`/fleet/${sighting.vehicle_id}`}
                  className="photo-frame block h-16 w-20 shrink-0 rounded border border-border"
                >
                  <PhotoImage src={cover?.url} alt="" className="h-full w-full" />
                </Link>
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold text-foreground">
                    {sighting.fleet_number ? `#${sighting.fleet_number}` : "Unnumbered vehicle"}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                    {[sighting.manufacturer, sighting.model, sighting.generation]
                      .filter(Boolean)
                      .join(" · ") || "No model details"}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                    {sighting.operator_name ?? "No operator"}
                  </p>
                  <div className="mt-1.5">
                    <StatusBadge status={sighting.vehicle_status} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sighting details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2.5 text-[12px]">
                <Row label="Date and time" value={spottedLabel} mono />
                <Row label="Route" value={sighting.route ?? "—"} mono />
                <Row label="Direction" value={sighting.direction ?? "—"} />
                <Row label="Location" value={sighting.location_name ?? "—"} />
                <Row
                  label="Coordinates"
                  value={
                    sighting.latitude !== null && sighting.longitude !== null
                      ? `${sighting.latitude.toFixed(5)}, ${sighting.longitude.toFixed(5)}`
                      : "Not recorded"
                  }
                  mono
                />
                <Row label="Weather" value={sighting.weather ?? "—"} />
                <Row
                  label="Photographs"
                  value={`${photos.length} · ${formatFileSize(
                    managedPhotos.reduce((sum, photo) => sum + (photo.size ?? 0), 0),
                  )}`}
                  mono
                />
              </dl>
            </CardContent>
          </Card>

          {cameraRows.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Camera settings</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-3">
                  {cameraRows.map((row) => {
                    const Icon = row.icon;
                    return (
                      <div key={row.label} className="flex items-start gap-2">
                        <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <dt className="text-[10px] tracking-wide text-muted-foreground uppercase">
                            {row.label}
                          </dt>
                          <dd className="mt-0.5 truncate font-mono text-[11.5px] text-foreground">
                            {row.value}
                          </dd>
                        </div>
                      </div>
                    );
                  })}
                </dl>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Camera settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                  No camera metadata recorded. You can add it by editing the sighting.
                </p>
              </CardContent>
            </Card>
          )}

          {mapPoint ? (
            <Card>
              <CardHeader>
                <CardTitle>Location</CardTitle>
                <CardDescription>
                  {sighting.location_name ?? "Recorded coordinates"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SightingsMap
                  points={[mapPoint]}
                  defaults={mapDefaults}
                  className="h-[240px]"
                />
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <p className="text-[10.5px] text-muted-foreground">
        Recorded {spottedLabel} · updated{" "}
        {formatDateTime(
          sighting.updated_at,
          viewer.preferences.date_style,
          viewer.preferences.time_format,
          viewer.timeZone,
        )}{" "}
        · {formatNumber(photos.length)} photograph{photos.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/50 pb-2 last:border-0 last:pb-0">
      <dt className="text-[11.5px] text-muted-foreground">{label}</dt>
      <dd
        className={
          mono
            ? "text-right font-mono text-[11.5px] text-foreground"
            : "text-right text-[11.5px] text-foreground"
        }
      >
        {value}
      </dd>
    </div>
  );
}
