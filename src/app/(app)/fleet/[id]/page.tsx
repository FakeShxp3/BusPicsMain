import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeftIcon,
  BusFrontIcon,
  CameraIcon,
  ExternalLinkIcon,
  ImagesIcon,
  MapPinIcon,
  PencilIcon,
  PlusIcon,
  RouteIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/vehicles/status-badge";
import { VehicleStatusActions } from "@/components/vehicles/vehicle-status-actions";
import { VehiclePhotoWall } from "@/components/vehicles/vehicle-photo-wall";
import { PhotoImage } from "@/components/common/photo-image";
import { getVehicleDetail, getVehiclePhotos } from "@/lib/queries/vehicles";
import { getSignedUrlMap } from "@/lib/photos-server";
import { getViewer } from "@/lib/supabase/server";
import {
  formatDate,
  formatDateOnly,
  formatDateTime,
  formatLength,
  formatNumber,
} from "@/lib/format";
import { VEHICLE_STATUS_LABELS } from "@/lib/constants";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const metadata: Metadata = { title: "Vehicle" };

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) notFound();

  const viewer = await getViewer();
  const detail = await getVehicleDetail(id);
  if (!detail) notFound();

  const { vehicle, history, sightings } = detail;
  const photos = await getVehiclePhotos(id);

  const signed = await getSignedUrlMap([
    ...photos.map((photo) => photo.storage_path),
    vehicle.cover_storage_path,
  ]);
  const urls = Object.fromEntries(signed);

  const photoItems = photos.map((photo) => ({
    id: photo.id,
    url: urls[photo.storage_path] ?? null,
    caption: photo.caption,
    altText: photo.alt_text,
    filename: photo.original_filename,
    width: photo.width,
    height: photo.height,
    spottedAt: photo.spotted_at,
    route: photo.route,
    locationName: photo.location_name,
    sightingId: photo.sighting_id,
    fleetNumber: photo.fleet_number,
    operatorName: photo.operator_name,
  }));

  const coverPhoto = vehicle.cover_photo_id
    ? photoItems.find((photo) => photo.id === vehicle.cover_photo_id)
    : undefined;
  const coverUrl = coverPhoto?.url ?? photoItems[0]?.url ?? null;

  const specs: { label: string; value: React.ReactNode; mono?: boolean }[] = [
    { label: "Operator", value: vehicle.operator_name ?? "Not recorded" },
    {
      label: "Fleet number",
      value: vehicle.fleet_number ?? "Not recorded",
      mono: true,
    },
    { label: "Manufacturer", value: vehicle.manufacturer ?? "Not recorded" },
    { label: "Model", value: vehicle.model ?? "Not recorded" },
    { label: "Generation", value: vehicle.generation ?? "—" },
    { label: "Category", value: vehicle.vehicle_category ?? "—" },
    { label: "Powertrain", value: vehicle.powertrain ?? "—" },
    {
      label: "Length",
      value: formatLength(vehicle.length_m, viewer.preferences.units),
      mono: true,
    },
    {
      label: "Model year",
      value: vehicle.model_year ? String(vehicle.model_year) : "—",
      mono: true,
    },
    {
      label: "In service",
      value: vehicle.in_service_year ? String(vehicle.in_service_year) : "—",
      mono: true,
    },
    {
      label: "Status verified",
      value: vehicle.status_verified_on
        ? formatDateOnly(vehicle.status_verified_on, viewer.preferences.date_style)
        : "Never",
    },
    {
      label: "Added",
      value: formatDate(vehicle.created_at, viewer.preferences.date_style, viewer.timeZone),
    },
  ];

  return (
    <div className="space-y-6">
      <Link
        href="/fleet"
        className="inline-flex w-fit items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" />
        Fleet database
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="photo-frame aspect-[16/10] overflow-hidden rounded-lg border border-border">
          <PhotoImage
            src={coverUrl}
            alt={
              vehicle.fleet_number
                ? `Photograph of fleet ${vehicle.fleet_number}`
                : "Vehicle photograph"
            }
            className="h-full w-full"
            imgClassName="object-cover"
            loading="eager"
          />
          <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
            <span className="rounded border border-white/20 bg-black/60 px-2 py-0.5 font-mono text-[11px] font-medium text-white">
              {vehicle.fleet_number ? `#${vehicle.fleet_number}` : "Unnumbered"}
            </span>
            <StatusBadge status={vehicle.status} />
          </div>
          {!coverUrl ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
              <BusFrontIcon className="size-6" strokeWidth={1.5} />
              <p className="text-[11.5px]">No photograph yet</p>
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col">
          <p className="eyebrow">{vehicle.operator_name ?? "No operator recorded"}</p>
          <h1 className="mt-2 font-mono text-[34px] leading-none font-semibold tracking-tight text-foreground">
            {vehicle.fleet_number ? `#${vehicle.fleet_number}` : "—"}
          </h1>
          <p className="mt-2 text-[15px] text-muted-foreground">
            {[vehicle.manufacturer, vehicle.model, vehicle.generation]
              .filter(Boolean)
              .join(" · ") || "No model details recorded"}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={vehicle.status} />
            {vehicle.vehicle_category ? (
              <Badge variant="outline">{vehicle.vehicle_category}</Badge>
            ) : null}
            {vehicle.powertrain ? (
              <Badge variant="outline">{vehicle.powertrain}</Badge>
            ) : null}
            {vehicle.model_year ? (
              <Badge variant="secondary" className="font-mono">
                {vehicle.model_year}
              </Badge>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href={`/sightings/new?vehicle=${vehicle.id}`}>
                <PlusIcon />
                Record sighting
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/fleet/${vehicle.id}/edit`}>
                <PencilIcon />
                Edit vehicle
              </Link>
            </Button>
            <VehicleStatusActions
              vehicleId={vehicle.id}
              fleetNumber={vehicle.fleet_number}
              status={vehicle.status}
              statusVerifiedOn={vehicle.status_verified_on}
              sightingCount={sightings.length}
              photoCount={photos.length}
            />
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 text-[12px]">
            <div>
              <dt className="text-[10.5px] tracking-wide text-muted-foreground uppercase">
                First seen
              </dt>
              <dd className="mt-0.5 text-foreground">
                {vehicle.first_spotted_at
                  ? formatDate(vehicle.first_spotted_at, viewer.preferences.date_style, viewer.timeZone)
                  : "Not yet spotted"}
              </dd>
            </div>
            <div>
              <dt className="text-[10.5px] tracking-wide text-muted-foreground uppercase">
                Last seen
              </dt>
              <dd className="mt-0.5 text-foreground">
                {vehicle.last_spotted_at
                  ? formatDate(vehicle.last_spotted_at, viewer.preferences.date_style, viewer.timeZone)
                  : "Not yet spotted"}
              </dd>
            </div>
            <div>
              <dt className="text-[10.5px] tracking-wide text-muted-foreground uppercase">
                Sightings
              </dt>
              <dd className="mt-0.5 font-mono text-foreground">{vehicle.sighting_count}</dd>
            </div>
            <div>
              <dt className="text-[10.5px] tracking-wide text-muted-foreground uppercase">
                Photographs
              </dt>
              <dd className="mt-0.5 font-mono text-foreground">{vehicle.photo_count}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Card>
            <CardHeader className="flex-row flex-wrap items-start justify-between gap-2">
              <div className="space-y-1">
                <CardTitle>Photographs</CardTitle>
                <CardDescription>
                  {photos.length} image{photos.length === 1 ? "" : "s"} across its{" "}
                  {sightings.length} sighting{sightings.length === 1 ? "" : "s"}.
                </CardDescription>
              </div>
              <Link
                href={`/sightings?vehicle=${vehicle.id}&view=gallery`}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                Gallery <ExternalLinkIcon className="size-3" />
              </Link>
            </CardHeader>
            <CardContent>
              <VehiclePhotoWall
                vehicleId={vehicle.id}
                coverPhotoId={vehicle.cover_photo_id}
                photos={photoItems}
                timeZone={viewer.timeZone}
                dateStyle={viewer.preferences.date_style}
                timeFormat={viewer.preferences.time_format}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row flex-wrap items-start justify-between gap-2">
              <div className="space-y-1">
                <CardTitle>Sighting chronology</CardTitle>
                <CardDescription>
                  Every recorded observation, newest first.
                </CardDescription>
              </div>
              {sightings.length > 0 ? (
                <Link
                  href={`/sightings?vehicle=${vehicle.id}`}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  Filtered log <ExternalLinkIcon className="size-3" />
                </Link>
              ) : null}
            </CardHeader>
            <CardContent>
              {sightings.length === 0 ? (
                <EmptyState
                  icon={CameraIcon}
                  compact
                  title="No sightings yet"
                  description="Record the first time you saw this vehicle to start its history."
                  action={
                    <Button asChild size="sm">
                      <Link href={`/sightings/new?vehicle=${vehicle.id}`}>
                        <PlusIcon />
                        Record sighting
                      </Link>
                    </Button>
                  }
                />
              ) : (
                <ol className="divide-y divide-border/70">
                  {sightings.map((sighting) => (
                    <li key={sighting.id}>
                      <Link
                        href={`/sightings/${sighting.id}`}
                        className="group flex items-start gap-3 py-2.5 first:pt-0 last:pb-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        <span className="photo-frame mt-0.5 block h-11 w-14 shrink-0 rounded border border-border">
                          <PhotoImage
                            src={
                              sighting.cover_storage_path
                                ? (urls[sighting.cover_storage_path] ?? null)
                                : null
                            }
                            alt=""
                            className="h-full w-full"
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-baseline gap-x-2">
                            <span className="font-mono text-[12px] text-foreground">
                              {formatDateTime(
                                sighting.spotted_at,
                                viewer.preferences.date_style,
                                viewer.preferences.time_format,
                                viewer.timeZone,
                              )}
                            </span>
                            {sighting.route ? (
                              <span className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                <RouteIcon className="size-2.5" />
                                {sighting.route}
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-0.5 block truncate text-[11.5px] text-muted-foreground">
                            {[sighting.location_name, sighting.direction]
                              .filter(Boolean)
                              .join(" · ") || "No location recorded"}
                          </span>
                          {sighting.notes ? (
                            <span className="mt-0.5 block truncate text-[11px] text-muted-foreground/80 italic">
                              {sighting.notes}
                            </span>
                          ) : null}
                        </span>
                        <span className="inline-flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
                          <ImagesIcon className="size-3" />
                          {sighting.photo_count}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Specifications</CardTitle>
              <CardDescription>As recorded in your fleet database.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2.5">
                {specs.map((spec) => (
                  <div
                    key={spec.label}
                    className="flex items-start justify-between gap-3 border-b border-border/50 pb-2 last:border-0 last:pb-0"
                  >
                    <dt className="text-[11.5px] text-muted-foreground">{spec.label}</dt>
                    <dd
                      className={
                        spec.mono
                          ? "text-right font-mono text-[11.5px] text-foreground"
                          : "text-right text-[11.5px] text-foreground"
                      }
                    >
                      {spec.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status history</CardTitle>
              <CardDescription>
                Manually recorded. Never synchronised with a transit agency.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                  No status changes recorded. The current status is{" "}
                  <span className="font-medium text-foreground">
                    {VEHICLE_STATUS_LABELS[vehicle.status]}
                  </span>
                  .
                </p>
              ) : (
                <ol className="relative space-y-4 border-l border-border pl-4">
                  {history.map((entry) => (
                    <li key={entry.id} className="relative">
                      <span className="absolute top-1 -left-[21px] size-2 rounded-full border border-card bg-primary" />
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={entry.new_status} />
                        <span className="font-mono text-[10.5px] text-muted-foreground">
                          {formatDateOnly(
                            entry.changed_on,
                            viewer.preferences.date_style,
                          )}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {entry.previous_status
                          ? `Changed from ${VEHICLE_STATUS_LABELS[entry.previous_status]}`
                          : "Initial status recorded"}
                      </p>
                      {entry.notes ? (
                        <p className="mt-1 text-[11.5px] leading-relaxed text-foreground">
                          {entry.notes}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          {vehicle.routes.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Routes photographed</CardTitle>
                <CardDescription>Distinct routes seen with this vehicle.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {vehicle.routes.map((route) => (
                    <Link
                      key={route}
                      href={`/sightings?vehicle=${vehicle.id}&route=${encodeURIComponent(route)}`}
                      className="rounded border border-border bg-muted/40 px-2 py-0.5 font-mono text-[11px] text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      {route}
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="flex-row items-start justify-between gap-2">
              <div className="space-y-1">
                <CardTitle>Notes</CardTitle>
                <CardDescription>Private to your account.</CardDescription>
              </div>
              <Link
                href={`/fleet/${vehicle.id}/edit`}
                className="text-[11px] text-primary hover:underline"
              >
                Edit
              </Link>
            </CardHeader>
            <CardContent>
              {vehicle.notes ? (
                <p className="text-[12px] leading-relaxed whitespace-pre-wrap text-foreground">
                  {vehicle.notes}
                </p>
              ) : (
                <p className="text-[11.5px] text-muted-foreground">
                  No notes yet. Add depot details, condition or anything worth
                  remembering.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <p className="text-[10.5px] text-muted-foreground">
        {vehicle.sighting_count} recorded sighting
        {vehicle.sighting_count === 1 ? "" : "s"} · {formatNumber(vehicle.photo_count)}{" "}
        photograph{vehicle.photo_count === 1 ? "" : "s"} ·{" "}
        <Link href="/map" className="text-primary hover:underline">
          view on the map
        </Link>
        {vehicle.last_spotted_at ? (
          <>
            {" "}
            · last seen{" "}
            <MapPinIcon className="inline size-3" />{" "}
            {formatDate(
              vehicle.last_spotted_at,
              viewer.preferences.date_style,
              viewer.timeZone,
            )}
          </>
        ) : null}
      </p>
    </div>
  );
}
