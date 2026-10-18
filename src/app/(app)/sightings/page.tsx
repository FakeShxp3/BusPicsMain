import type { Metadata } from "next";
import Link from "next/link";
import { CameraIcon, PlusIcon, SearchXIcon } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Pagination } from "@/components/common/pagination";
import { Button } from "@/components/ui/button";
import { SightingsToolbar } from "@/components/sightings/sightings-toolbar";
import { SightingsCollection } from "@/components/sightings/sightings-collection";
import { getArchiveFacets } from "@/lib/queries/facets";
import { listSightings, parseSightingFilters } from "@/lib/queries/sightings";
import { paginationParams } from "@/lib/queries/params";
import { getVehicleSummary } from "@/lib/queries/vehicles";
import { getSignedUrlMap } from "@/lib/photos-server";
import { getViewer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Sightings" };

export default async function SightingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await getViewer();
  const params = await searchParams;
  const filters = parseSightingFilters(params, {
    view: viewer.preferences.default_sighting_view,
  });

  const [result, facets, vehicleSummary] = await Promise.all([
    listSightings(filters),
    getArchiveFacets(),
    filters.vehicle ? getVehicleSummary(filters.vehicle) : Promise.resolve(null),
  ]);

  const signedUrls = await getSignedUrlMap(
    result.rows.map((sighting) => sighting.cover_storage_path),
  );
  const coverUrls = Object.fromEntries(signedUrls);

  const operatorName = filters.operator
    ? facets.operators.find((operator) => operator.id === filters.operator)?.name
    : undefined;

  const vehicleLabel = vehicleSummary
    ? `Fleet ${vehicleSummary.fleet_number ?? "vehicle"}${vehicleSummary.model ? ` · ${vehicleSummary.model}` : ""}`
    : undefined;

  const hasFilters = Boolean(
    filters.q ||
      filters.operator ||
      filters.model ||
      filters.category ||
      filters.route ||
      filters.vehicle ||
      filters.from ||
      filters.to,
  );

  const paginationValues = paginationParams({
    q: filters.q,
    operator: filters.operator,
    model: filters.model,
    category: filters.category,
    route: filters.route,
    vehicle: filters.vehicle,
    from: filters.from,
    to: filters.to,
    sort: filters.sort,
    view: filters.view,
  });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Field log · sightings"
        title="Sightings"
        description="One record per observation, with the route, place, camera settings and photographs attached to it."
        actions={
          <Button asChild size="sm">
            <Link href="/sightings/new">
              <PlusIcon />
              Add sighting
            </Link>
          </Button>
        }
      />

      <SightingsToolbar
        filters={filters}
        facets={facets}
        total={result.count}
        timeZone={viewer.timeZone}
        operatorName={operatorName}
        vehicleLabel={vehicleLabel}
      />

      {result.count === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={SearchXIcon}
            title="No sightings match these filters"
            description="Try widening the date range or clearing a filter to see more of your field log."
            action={
              <Button asChild variant="outline">
                <Link href="/sightings">Reset filters</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={CameraIcon}
            eyebrow="The log is empty"
            title="Record the first bus you spot"
            description="A sighting ties a vehicle to a moment, a route and a place. You can add photographs straight away or come back for them later."
            action={
              <Button asChild>
                <Link href="/sightings/new">
                  <PlusIcon />
                  Record first sighting
                </Link>
              </Button>
            }
            secondaryAction={
              <Button asChild variant="outline">
                <Link href="/fleet/new">Add a vehicle first</Link>
              </Button>
            }
          />
        )
      ) : (
        <SightingsCollection
          sightings={result.rows}
          coverUrls={coverUrls}
          view={filters.view}
          timeZone={viewer.timeZone}
          dateStyle={viewer.preferences.date_style}
          timeFormat={viewer.preferences.time_format}
        />
      )}

      <Pagination
        basePath="/sightings"
        params={paginationValues}
        page={result.page}
        pageCount={result.pageCount}
        total={result.count}
        pageSize={result.pageSize}
        itemLabel="sightings"
      />
    </div>
  );
}
