import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  CameraIcon,
  MapPinIcon,
  MapPinOffIcon,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MapFiltersBar } from "@/components/map/map-filters";
import { SightingsMap } from "@/components/map/sightings-map";
import { PhotoImage } from "@/components/common/photo-image";
import { getArchiveFacets } from "@/lib/queries/facets";
import { listMapSightings, parseMapFilters } from "@/lib/queries/map";
import { getSignedUrlMap } from "@/lib/photos-server";
import { getViewer } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { DEFAULT_MAP_CENTER } from "@/lib/constants";
import type { MapSighting } from "@/lib/map-types";

export const metadata: Metadata = { title: "Spotting map" };

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await getViewer();
  const params = await searchParams;
  const filters = parseMapFilters(params);

  const [data, facets] = await Promise.all([
    listMapSightings(filters),
    getArchiveFacets(),
  ]);

  const signedUrls = await getSignedUrlMap(
    data.points.map((sighting) => sighting.cover_storage_path),
  );
  const urls = Object.fromEntries(signedUrls);

  const points: MapSighting[] = data.points
    .filter(
      (sighting): sighting is typeof sighting & {
        latitude: number;
        longitude: number;
      } => sighting.latitude !== null && sighting.longitude !== null,
    )
    .map((sighting) => ({
      id: sighting.id,
      sightingId: sighting.id,
      latitude: sighting.latitude,
      longitude: sighting.longitude,
      fleetNumber: sighting.fleet_number,
      dateLabel: formatDateTime(
        sighting.spotted_at,
        viewer.preferences.date_style,
        viewer.preferences.time_format,
        viewer.timeZone,
      ),
      route: sighting.route,
      locationName: sighting.location_name,
      coverUrl: sighting.cover_storage_path
        ? (urls[sighting.cover_storage_path] ?? null)
        : null,
      vehicleId: sighting.vehicle_id,
    }));

  const mapDefaults = {
    latitude: viewer.preferences.map_center_lat ?? DEFAULT_MAP_CENTER.lat,
    longitude: viewer.preferences.map_center_lng ?? DEFAULT_MAP_CENTER.lng,
    zoom: viewer.preferences.map_zoom ?? DEFAULT_MAP_CENTER.zoom,
  };

  const recent = points.slice(0, 30);
  const hasFilters = Boolean(
    filters.operator || filters.model || filters.route || filters.from || filters.to,
  );

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Geography · spotting map"
        title="Spotting map"
        description="Every sighting with coordinates, plotted from your actual records. Filter by operator, model, route or date."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/sightings">
              Sightings log
              <ArrowRightIcon />
            </Link>
          </Button>
        }
      />

      <MapFiltersBar
        filters={filters}
        facets={facets}
        timeZone={viewer.timeZone}
        count={points.length}
      />

      {points.length === 0 ? (
        <EmptyState
          icon={MapPinOffIcon}
          eyebrow="Nothing on the map"
          title={hasFilters ? "No located sightings match these filters" : "No located sightings yet"}
          description={
            hasFilters
              ? "Clear a filter or widen the date range. Sightings without coordinates stay available in the log."
              : "Add a location while recording a sighting — click the map or enter coordinates. Your photographs' embedded GPS data is never used automatically."
          }
          action={
            hasFilters ? (
              <Button asChild variant="outline">
                <Link href="/map">Reset filters</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/sightings/new">
                  <CameraIcon />
                  Record a sighting
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_310px]">
          <SightingsMap
            points={points}
            defaults={mapDefaults}
            className="h-[clamp(420px,calc(100dvh-19rem),760px)]"
          />

          <Card className="flex max-h-[calc(100dvh-19rem)] min-h-[320px] flex-col overflow-hidden">
            <CardHeader className="border-b border-border/70 pb-3">
              <CardTitle>Recent spots</CardTitle>
              <CardDescription>
                {points.length > 30 ? `Latest 30 of ${points.length}` : `${points.length} located sighting${points.length === 1 ? "" : "s"}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-2">
              <ul className="space-y-0.5">
                {recent.map((point) => (
                  <li key={point.id}>
                    <Link
                      href={`/sightings/${point.sightingId}`}
                      className="flex items-center gap-2.5 rounded px-1.5 py-2 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <span className="photo-frame block h-10 w-14 shrink-0 rounded border border-border">
                        <PhotoImage src={point.coverUrl} alt="" className="h-full w-full" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                          <span className="font-mono text-[12px] font-semibold text-foreground">
                            {point.fleetNumber ? `#${point.fleetNumber}` : "—"}
                          </span>
                          {point.route ? (
                            <span className="rounded border border-border px-1 font-mono text-[9.5px] text-muted-foreground">
                              {point.route}
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block truncate text-[10.5px] text-muted-foreground">
                          {point.dateLabel}
                        </span>
                        <span className="block truncate text-[10.5px] text-muted-foreground">
                          <MapPinIcon className="mr-0.5 inline size-2.5" />
                          {point.locationName ?? "Coordinates recorded"}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] text-muted-foreground">
        <MapPinIcon className="size-3" />
        Map data © OpenStreetMap contributors. Coordinates come only from your manual
        entries.
        {data.withoutCoordinates > 0 ? (
          <>
            <span className="text-border">|</span>
            <span>
              {data.withoutCoordinates} sighting
              {data.withoutCoordinates === 1 ? "" : "s"} without coordinates remain in the{" "}
              <Link href="/sightings" className="text-primary hover:underline">
                sightings log
              </Link>
              .
            </span>
          </>
        ) : null}
      </p>
    </div>
  );
}
