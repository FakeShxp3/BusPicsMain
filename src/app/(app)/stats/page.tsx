import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRightIcon,
  BusFrontIcon,
  CalendarDaysIcon,
  CameraIcon,
  ImagesIcon,
  RouteIcon,
  TrendingUpIcon,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { StatCard } from "@/components/common/stat-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActivityChart, ChartLegend } from "@/components/charts/activity-chart";
import { DistributionDonut } from "@/components/charts/distribution-donut";
import { StatsFiltersBar } from "@/components/stats/stats-filters";
import { getArchiveFacets } from "@/lib/queries/facets";
import { getStats, parseStatsFilters, type StatsFilters } from "@/lib/queries/stats";
import { getViewer } from "@/lib/supabase/server";
import {
  formatNumber,
  formatPercent,
} from "@/lib/format";

export const metadata: Metadata = { title: "Statistics" };

function sightingsHref(
  filters: StatsFilters,
  extra: Record<string, string> = {},
): string {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.operator) params.set("operator", filters.operator);
  if (filters.category) params.set("category", filters.category);
  for (const [key, value] of Object.entries(extra)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `/sightings?${query}` : "/sightings";
}

const STATUS_TO_VALUE: Record<string, string> = {
  Active: "active",
  Retired: "retired",
  Scrapped: "scrapped",
  Transferred: "transferred",
  Unknown: "unknown",
};

export default async function StatisticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await getViewer();
  const params = await searchParams;
  const filters = parseStatsFilters(params);

  const [stats, facets] = await Promise.all([
    getStats(filters, viewer.timeZone),
    getArchiveFacets(),
  ]);

  const totalActivity = stats.monthly.reduce((sum, item) => sum + item.sightings, 0);
  const hasFilters = Boolean(
    filters.from || filters.to || filters.operator || filters.category,
  );

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Analysis · statistics"
        title="Statistics"
        description="Everything here is calculated from your saved records — no examples, samples or estimates. Filter the range and click any row to open the matching sightings."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/sightings">
              Sightings log
              <ArrowUpRightIcon />
            </Link>
          </Button>
        }
      />

      <StatsFiltersBar
        filters={filters}
        facets={facets}
        timeZone={viewer.timeZone}
      />

      {!stats.hasData ? (
        <EmptyState
          icon={TrendingUpIcon}
          eyebrow="Nothing to analyse yet"
          title="Statistics appear once records exist"
          description="Catalog a vehicle and record a sighting, and this page fills with your real coverage, routes and photography patterns."
          action={
            <Button asChild>
              <Link href="/sightings/new">
                <CameraIcon />
                Record a sighting
              </Link>
            </Button>
          }
          secondaryAction={
            <Button asChild variant="outline">
              <Link href="/fleet/new">Add a vehicle</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              label="Sightings"
              value={formatNumber(stats.totals.sightings)}
              hint={`${formatNumber(stats.totals.activeDays)} active day${stats.totals.activeDays === 1 ? "" : "s"}`}
              icon={CameraIcon}
              href={sightingsHref(filters)}
            />
            <StatCard
              label="Photographs"
              value={formatNumber(stats.totals.photos)}
              hint={`Across ${formatNumber(stats.totals.sightings)} sightings`}
              icon={ImagesIcon}
              href={sightingsHref(filters)}
            />
            <StatCard
              label="Unique vehicles"
              value={formatNumber(stats.totals.uniqueVehicles)}
              hint="Photographed in this range"
              icon={BusFrontIcon}
              href={sightingsHref(filters)}
            />
            <StatCard
              label="Routes"
              value={formatNumber(stats.totals.routes)}
              hint="Distinct routes recorded"
              icon={RouteIcon}
              href={sightingsHref(filters)}
            />
            <StatCard
              label="Fleet coverage"
              value={formatPercent(stats.coverage.photographed, stats.coverage.cataloged)}
              hint={`${formatNumber(stats.coverage.photographed)} of ${formatNumber(stats.coverage.cataloged)} catalogued`}
              icon={CalendarDaysIcon}
              href="/fleet"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <Card>
              <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle>Activity over time</CardTitle>
                  <CardDescription>
                    Sightings and photographs by month across the recorded range.
                  </CardDescription>
                </div>
                <ChartLegend
                  items={[
                    { label: "Sightings", color: "var(--chart-1)" },
                    { label: "Photographs", color: "var(--chart-3)", shape: "line" },
                  ]}
                />
              </CardHeader>
              <CardContent>
                {totalActivity > 0 ? (
                  <ActivityChart data={stats.monthly} height={280} />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-center">
                    <p className="max-w-xs text-[12px] text-muted-foreground">
                      No sightings were recorded in this range. Adjust the date filter to
                      see activity.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fleet coverage</CardTitle>
                <CardDescription>
                  Vehicles photographed at least once versus the whole catalogued fleet.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-end justify-between gap-2">
                  <p className="numeric text-3xl font-semibold tracking-tight">
                    {stats.coverage.percent}%
                  </p>
                  <p className="pb-1 text-[11px] text-muted-foreground">
                    {formatNumber(stats.coverage.photographed)} /{" "}
                    {formatNumber(stats.coverage.cataloged)} vehicles
                  </p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.max(2, stats.coverage.percent)}%` }}
                  />
                </div>
                <dl className="grid grid-cols-2 gap-3 border-t border-border/70 pt-3 text-[11.5px]">
                  <div>
                    <dt className="text-muted-foreground">Catalogued</dt>
                    <dd className="font-mono text-foreground">
                      {formatNumber(stats.coverage.cataloged)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Not yet photographed</dt>
                    <dd className="font-mono text-foreground">
                      {formatNumber(stats.coverage.withoutSightings)}
                    </dd>
                  </div>
                </dl>

                {stats.distribution.statuses.length > 0 ? (
                  <div className="border-t border-border/70 pt-3">
                    <p className="mb-2 text-[10px] tracking-wide text-muted-foreground uppercase">
                      Fleet status
                    </p>
                    <ul className="space-y-1.5">
                      {stats.distribution.statuses.map((status) => {
                        const value = STATUS_TO_VALUE[status.name];
                        return (
                          <li key={status.name}>
                            <Link
                              href={
                                value
                                  ? `/fleet?status=${value}`
                                  : "/fleet"
                              }
                              className="group flex items-center justify-between gap-2 text-[11.5px]"
                            >
                              <span className="text-muted-foreground group-hover:text-foreground">
                                {status.name}
                              </span>
                              <span className="font-mono text-foreground">{status.count}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}

                <p className="text-[10.5px] leading-relaxed text-muted-foreground">
                  Coverage uses the catalogued fleet and the sightings in the selected
                  range. Status values are manually recorded.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>By operator</CardTitle>
                <CardDescription>Sightings in this range.</CardDescription>
              </CardHeader>
              <CardContent>
                <BarList
                  total={stats.totals.sightings}
                  emptyLabel="No operator data in this range."
                  items={stats.byOperator.map((row) => ({
                    label: row.name,
                    count: row.count,
                    href: row.operatorId
                      ? sightingsHref(filters, { operator: row.operatorId })
                      : sightingsHref(filters),
                    detail: `${formatNumber(row.photos)} photo${row.photos === 1 ? "" : "s"}`,
                  }))}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>By route</CardTitle>
                <CardDescription>Most recorded routes.</CardDescription>
              </CardHeader>
              <CardContent>
                <BarList
                  total={stats.totals.sightings}
                  emptyLabel="No routes recorded in this range."
                  items={stats.byRoute.map((row) => ({
                    label: row.name,
                    count: row.count,
                    href:
                      row.name === "Unspecified"
                        ? sightingsHref(filters)
                        : sightingsHref(filters, { route: row.name }),
                  }))}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>By model</CardTitle>
                <CardDescription>Where your coverage is concentrated.</CardDescription>
              </CardHeader>
              <CardContent>
                <BarList
                  total={stats.totals.sightings}
                  emptyLabel="No models recorded in this range."
                  items={stats.byModel.map((row) => ({
                    label: row.model,
                    count: row.sightings,
                    href: sightingsHref(filters, { model: row.model }),
                    detail: `${formatNumber(row.photos)} photo${row.photos === 1 ? "" : "s"}`,
                  }))}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Card>
              <CardHeader>
                <CardTitle>Most frequently spotted vehicles</CardTitle>
                <CardDescription>
                  Ranked by sightings in the selected range.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats.topVehicles.length === 0 ? (
                  <p className="py-6 text-center text-[12px] text-muted-foreground">
                    No vehicles in this range.
                  </p>
                ) : (
                  <ul className="divide-y divide-border/70">
                    {stats.topVehicles.map((vehicle, index) => (
                      <li key={vehicle.vehicleId}>
                        <Link
                          href={`/fleet/${vehicle.vehicleId}`}
                          className="group flex items-center gap-3 py-2 first:pt-0 last:pb-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          <span className="w-4 shrink-0 font-mono text-[10px] text-muted-foreground">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-mono text-[12.5px] font-semibold text-foreground group-hover:text-primary">
                              {vehicle.fleetNumber ? `#${vehicle.fleetNumber}` : "Unnumbered"}
                            </span>
                            <span className="block truncate text-[10.5px] text-muted-foreground">
                              {[vehicle.operatorName, vehicle.model].filter(Boolean).join(" · ")}
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="block font-mono text-[12px] text-foreground">
                              {vehicle.sightings}
                            </span>
                            <span className="block text-[9.5px] text-muted-foreground">
                              {vehicle.photos} photo{vehicle.photos === 1 ? "" : "s"}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-1">
              <Card>
                <CardHeader>
                  <CardTitle>Vehicle categories</CardTitle>
                  <CardDescription>Catalogued fleet.</CardDescription>
                </CardHeader>
                <CardContent>
                  <DistributionDonut
                    data={stats.distribution.categories}
                    centerLabel="vehicles"
                    centerValue={formatNumber(stats.coverage.cataloged)}
                    height={180}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Powertrains</CardTitle>
                  <CardDescription>Catalogued fleet.</CardDescription>
                </CardHeader>
                <CardContent>
                  <DistributionDonut
                    data={stats.distribution.powertrains}
                    centerLabel="vehicles"
                    centerValue={formatNumber(stats.coverage.cataloged)}
                    height={180}
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          <p className="pb-2 text-[10.5px] leading-relaxed text-muted-foreground">
            Counts are exact for the records in the selected range.{" "}
            {hasFilters ? (
              <Badge variant="secondary" className="ml-1 font-normal">
                Filtered view
              </Badge>
            ) : null}{" "}
            Photographs are counted through their sightings; a photo belongs to exactly
            one sighting.
          </p>
        </>
      )}
    </div>
  );
}

function BarList({
  items,
  total,
  emptyLabel,
}: {
  items: { label: string; count: number; href: string; detail?: string }[];
  total: number;
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-[12px] text-muted-foreground">{emptyLabel}</p>
    );
  }

  const max = Math.max(...items.map((item) => item.count), 1);

  return (
    <ul className="space-y-2.5">
      {items.slice(0, 8).map((item) => (
        <li key={`${item.label}-${item.href}`}>
          <Link
            href={item.href}
            className="group block rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-[11.5px] text-foreground group-hover:text-primary">
                {item.label}
              </span>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                <span className="font-mono text-foreground">{item.count}</span>
                {item.detail ? <span className="ml-1.5">{item.detail}</span> : null}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/70 transition-all group-hover:bg-primary"
                  style={{ width: `${Math.max(3, (item.count / max) * 100)}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right font-mono text-[9.5px] text-muted-foreground">
                {formatPercent(item.count, total)}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
