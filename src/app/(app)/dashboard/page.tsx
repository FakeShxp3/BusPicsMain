import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  BusFrontIcon,
  CameraIcon,
  ImagesIcon,
  MapPinIcon,
  PlusIcon,
  UsersIcon,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ActivityChart, ChartLegend } from "@/components/charts/activity-chart";
import { OperatorBreakdown } from "@/components/dashboard/operator-breakdown";
import { RecentSightings } from "@/components/dashboard/recent-sightings";
import { FleetUpdates } from "@/components/dashboard/fleet-updates";
import { TopModels } from "@/components/dashboard/top-models";
import { SightingsMap } from "@/components/map/sightings-map";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { getSignedUrlMap } from "@/lib/photos-server";
import { getDashboardData } from "@/lib/queries/dashboard";
import { displayName, getViewer } from "@/lib/supabase/server";
import {
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import { DEFAULT_MAP_CENTER } from "@/lib/constants";
import type { MapSighting } from "@/lib/map-types";

export const metadata: Metadata = { title: "Dashboard" };

function greetingFor(timeZone: string): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hour12: false,
      timeZone,
    }).format(new Date()),
  );
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const viewer = await getViewer();
  const data = await getDashboardData(viewer.timeZone);

  const paths: (string | null)[] = [
    ...data.recentSightings.map((sighting) => sighting.cover_storage_path),
    ...data.recentVehicles.map((vehicle) => vehicle.cover_storage_path),
    ...data.mapPoints.map((point) => point.coverPath),
  ];
  const signedUrls = await getSignedUrlMap(paths);
  const coverUrls = Object.fromEntries(signedUrls);

  const firstName = displayName(viewer.profile, viewer.email).split(" ")[0] ?? "Spotter";
  const isEmpty = data.counts.vehicles === 0 && data.counts.sightings === 0;
  const photographedPercent = formatPercent(
    data.counts.photographedVehicles,
    data.counts.vehicles,
  );

  const mapPoints: MapSighting[] = data.mapPoints.map((point) => ({
    id: point.id,
    sightingId: point.sightingId,
    latitude: point.latitude,
    longitude: point.longitude,
    fleetNumber: point.fleetNumber,
    dateLabel: formatDateTime(
      point.spottedAt,
      viewer.preferences.date_style,
      viewer.preferences.time_format,
      viewer.timeZone,
    ),
    route: point.route,
    locationName: point.locationName,
    coverUrl: point.coverPath ? (coverUrls[point.coverPath] ?? null) : null,
    vehicleId: point.vehicleId,
  }));

  const mapDefaults = {
    latitude: viewer.preferences.map_center_lat ?? DEFAULT_MAP_CENTER.lat,
    longitude: viewer.preferences.map_center_lng ?? DEFAULT_MAP_CENTER.lng,
    zoom: viewer.preferences.map_zoom ?? DEFAULT_MAP_CENTER.zoom,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${formatDate(new Date().toISOString(), "long", viewer.timeZone)} · overview`}
        title={`${greetingFor(viewer.timeZone)}, ${firstName}`}
        description="Your fleet, your sightings and your photographs — all kept in one private archive."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/fleet/new">
                <BusFrontIcon />
                Add vehicle
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/sightings/new">
                <PlusIcon />
                Add sighting
              </Link>
            </Button>
          </>
        }
      />

      {isEmpty ? (
        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="grid grid-cols-1 gap-8 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
            <div>
              <p className="eyebrow">Your archive is empty</p>
              <h2 className="mt-3 max-w-md text-2xl font-semibold tracking-tight text-balance">
                Start with the bus you saw today.
              </h2>
              <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-muted-foreground">
                Create a vehicle record, then log the sighting with its route, place,
                camera settings and photographs. Nothing is public, and you can export
                everything whenever you like.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button asChild>
                  <Link href="/fleet/new">
                    <BusFrontIcon />
                    Add your first vehicle
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/sightings/new">
                    <CameraIcon />
                    Record a sighting
                  </Link>
                </Button>
              </div>
              <p className="mt-4 text-[11px] text-muted-foreground">
                A sighting can be recorded before you have a photograph — the form saves
                either way.
              </p>
            </div>

            <ol className="space-y-4 border-t border-border pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
              {[
                {
                  title: "Add the vehicle",
                  body: "Operator, fleet number, model and specs. Only a name or number is needed; the rest can wait.",
                },
                {
                  title: "Log the sighting",
                  body: "Date, route, direction, location and optional coordinates. Camera settings if you have them.",
                },
                {
                  title: "Build the archive",
                  body: "Upload photographs, choose a cover, and follow each vehicle's history over time.",
                },
              ].map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-border bg-muted font-mono text-[10px] font-semibold text-muted-foreground">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-[12.5px] font-medium text-foreground">{step.title}</p>
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              label="Sightings"
              value={formatNumber(data.counts.sightings)}
              hint={`${formatNumber(data.activeDays)} active day${data.activeDays === 1 ? "" : "s"}`}
              icon={CameraIcon}
              href="/sightings"
            />
            <StatCard
              label="Fleet vehicles"
              value={formatNumber(data.counts.vehicles)}
              hint={`${formatNumber(data.counts.photographedVehicles)} photographed`}
              icon={BusFrontIcon}
              href="/fleet"
            />
            <StatCard
              label="Photographs"
              value={formatNumber(data.counts.photos)}
              hint="Originals in private storage"
              icon={ImagesIcon}
              href="/gallery"
            />
            <StatCard
              label="Operators"
              value={formatNumber(data.counts.operators)}
              hint="Represented in your fleet"
              icon={UsersIcon}
              href="/operators"
            />
            <StatCard
              label="Photographed fleet"
              value={formatPercent(data.counts.photographedVehicles, data.counts.vehicles)}
              hint={`${formatNumber(data.counts.photographedVehicles)} of ${formatNumber(data.counts.vehicles)} catalogued`}
              icon={MapPinIcon}
              href="/fleet?sort=latest"
            />
          </div>

          {data.counts.sightings === 0 ? (
            <div className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <CameraIcon className="mt-0.5 size-4 text-primary" />
                <div>
                  <p className="text-[13px] font-medium text-foreground">
                    Your fleet is ready for its first sighting.
                  </p>
                  <p className="text-[11.5px] text-muted-foreground">
                    {formatNumber(data.counts.vehicles)} vehicle
                    {data.counts.vehicles === 1 ? "" : "s"} catalogued ·{" "}
                    {photographedPercent} photographed so far.
                  </p>
                </div>
              </div>
              <Button asChild size="sm">
                <Link href="/sightings/new">Record a sighting</Link>
              </Button>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Card>
              <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle>Photography activity</CardTitle>
                  <CardDescription>Sightings and photographs over the last 12 months.</CardDescription>
                </div>
                <ChartLegend
                  items={[
                    { label: "Sightings", color: "var(--chart-1)" },
                    { label: "Photographs", color: "var(--chart-3)", shape: "line" },
                  ]}
                />
              </CardHeader>
              <CardContent>
                <ActivityChart data={data.activity} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-start justify-between gap-2">
                <div className="space-y-1">
                  <CardTitle>By operator</CardTitle>
                  <CardDescription>Share of recorded sightings.</CardDescription>
                </div>
                <Link
                  href="/stats"
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  Details <ArrowRightIcon className="size-3" />
                </Link>
              </CardHeader>
              <CardContent>
                <OperatorBreakdown
                  rows={data.operatorBreakdown}
                  total={data.counts.sightings}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-2">
                <div className="space-y-1">
                  <CardTitle>Recent sightings</CardTitle>
                  <CardDescription>The latest entries in your field log.</CardDescription>
                </div>
                <Link
                  href="/sightings"
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  All sightings <ArrowRightIcon className="size-3" />
                </Link>
              </CardHeader>
              <CardContent>
                <RecentSightings
                  sightings={data.recentSightings}
                  coverUrls={coverUrls}
                  timeZone={viewer.timeZone}
                  dateStyle={viewer.preferences.date_style}
                  timeFormat={viewer.preferences.time_format}
                />
              </CardContent>
            </Card>

            <div className="space-y-5">
              <Card>
                <CardHeader className="flex-row items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle>Recently updated</CardTitle>
                    <CardDescription>Fleet records you touched last.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <FleetUpdates
                    vehicles={data.recentlyUpdated}
                    timeZone={viewer.timeZone}
                    dateStyle={viewer.preferences.date_style}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex-row items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle>Most photographed models</CardTitle>
                    <CardDescription>Where your archive is deepest.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <TopModels models={data.topModels} />
                </CardContent>
              </Card>
            </div>
          </div>

          <section className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold tracking-tight">Recently photographed</h2>
                <p className="text-[11.5px] text-muted-foreground">
                  Vehicles with the latest sightings in your fleet.
                </p>
              </div>
              <Link
                href="/fleet?sort=latest"
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                View fleet <ArrowRightIcon className="size-3" />
              </Link>
            </div>
            {data.recentVehicles.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {data.recentVehicles.map((vehicle) => (
                  <VehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    coverUrl={
                      vehicle.cover_storage_path
                        ? (coverUrls[vehicle.cover_storage_path] ?? null)
                        : null
                    }
                    timeZone={viewer.timeZone}
                    dateStyle={viewer.preferences.date_style}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border px-5 py-8 text-center text-[12px] text-muted-foreground">
                Vehicles you photograph will appear here once sightings are recorded.
              </div>
            )}
          </section>

          <Card>
            <CardHeader className="flex-row flex-wrap items-start justify-between gap-2">
              <div className="space-y-1">
                <CardTitle>Recent spotting map</CardTitle>
                <CardDescription>
                  {mapPoints.length > 0
                    ? `The ${mapPoints.length} most recent sightings with coordinates.`
                    : "Sightings with coordinates will appear on this map."}
                </CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/map">
                  Open map
                  <ArrowRightIcon />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <SightingsMap
                points={mapPoints}
                defaults={mapDefaults}
                className="h-[320px]"
                emptyMessage="No sighting has a location yet. Add coordinates while recording a sighting to place it on the map."
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
