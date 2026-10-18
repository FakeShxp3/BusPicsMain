import type { Metadata } from "next";
import Link from "next/link";
import {
  BusFrontIcon,
  PlusIcon,
  SearchXIcon,
  UsersIcon,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Pagination } from "@/components/common/pagination";
import { Button } from "@/components/ui/button";
import { FleetFilters } from "@/components/vehicles/fleet-filters";
import { VehicleTable } from "@/components/vehicles/vehicle-table";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { getArchiveFacets } from "@/lib/queries/facets";
import { listVehicles, parseVehicleFilters } from "@/lib/queries/vehicles";
import { getSignedUrlMap } from "@/lib/photos-server";
import { getViewer } from "@/lib/supabase/server";
import { paginationParams } from "@/lib/queries/params";

export const metadata: Metadata = { title: "Fleet database" };

export default async function FleetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await getViewer();
  const params = await searchParams;
  const filters = parseVehicleFilters(params, {
    view: viewer.preferences.default_vehicle_view,
  });

  const [result, facets] = await Promise.all([
    listVehicles(filters),
    getArchiveFacets(),
  ]);

  const signedUrls = await getSignedUrlMap(
    result.rows.map((vehicle) => vehicle.cover_storage_path),
  );
  const coverUrls = Object.fromEntries(signedUrls);

  const hasFilters = Boolean(
    filters.q ||
      filters.operator ||
      filters.manufacturer ||
      filters.model ||
      filters.category ||
      filters.powertrain ||
      filters.status,
  );

  const paginationValues = paginationParams({
    q: filters.q,
    operator: filters.operator,
    manufacturer: filters.manufacturer,
    model: filters.model,
    category: filters.category,
    powertrain: filters.powertrain,
    status: filters.status,
    sort: filters.sort,
    view: filters.view,
  });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Library · fleet database"
        title="Fleet database"
        description="Every vehicle you have documented, with its specifications, status and photographic history."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/operators">
                <UsersIcon />
                Operators
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/fleet/new">
                <PlusIcon />
                Add vehicle
              </Link>
            </Button>
          </>
        }
      />

      <FleetFilters filters={filters} facets={facets} total={result.count} />

      {result.count === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={SearchXIcon}
            title="No vehicles match these filters"
            description="Try removing a filter or searching for a different fleet number, model or operator."
            action={
              <Button asChild variant="outline">
                <Link href="/fleet">Reset filters</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={BusFrontIcon}
            eyebrow="Your fleet is empty"
            title="Catalog the first bus you have photographed"
            description="Fleet numbers, operators and technical details sit here. A new sighting can also create a vehicle inline, so you can start either way."
            action={
              <Button asChild>
                <Link href="/fleet/new">
                  <PlusIcon />
                  Add first vehicle
                </Link>
              </Button>
            }
            secondaryAction={
              <Button asChild variant="outline">
                <Link href="/operators">Add an operator first</Link>
              </Button>
            }
          />
        )
      ) : filters.view === "grid" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {result.rows.map((vehicle) => (
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
        <VehicleTable
          vehicles={result.rows}
          coverUrls={coverUrls}
          timeZone={viewer.timeZone}
          dateStyle={viewer.preferences.date_style}
          units={viewer.preferences.units}
        />
      )}

      <Pagination
        basePath="/fleet"
        params={paginationValues}
        page={result.page}
        pageCount={result.pageCount}
        total={result.count}
        pageSize={result.pageSize}
        itemLabel="vehicles"
      />
    </div>
  );
}
