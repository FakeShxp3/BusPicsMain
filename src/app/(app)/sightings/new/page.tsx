import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { SightingForm } from "@/components/sightings/sighting-form";
import { getArchiveFacets } from "@/lib/queries/facets";
import { listVehicleOptions } from "@/lib/queries/vehicles";
import { getViewer } from "@/lib/supabase/server";
import { DEFAULT_MAP_CENTER } from "@/lib/constants";

export const metadata: Metadata = { title: "Add sighting" };

export default async function NewSightingPage({
  searchParams,
}: {
  searchParams: Promise<{ vehicle?: string | string[] }>;
}) {
  const viewer = await getViewer();
  const params = await searchParams;
  const initialVehicleId =
    typeof params.vehicle === "string" ? params.vehicle : undefined;

  const [vehicleOptions, facets] = await Promise.all([
    listVehicleOptions(),
    getArchiveFacets(),
  ]);

  const mapDefaults = {
    latitude: viewer.preferences.map_center_lat ?? DEFAULT_MAP_CENTER.lat,
    longitude: viewer.preferences.map_center_lng ?? DEFAULT_MAP_CENTER.lng,
    zoom: viewer.preferences.map_zoom ?? DEFAULT_MAP_CENTER.zoom,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Field log"
        title="Record a sighting"
        description="A quick note of where and when you saw a vehicle. Most fields are optional, and the date starts at the current local time."
        back={{ href: "/sightings", label: "Sightings" }}
      />
      <SightingForm
        mode="create"
        vehicles={vehicleOptions.options}
        totalVehicles={vehicleOptions.total}
        operators={facets.operators}
        routes={facets.routes}
        userId={viewer.userId}
        mapDefaults={mapDefaults}
        initialVehicleId={initialVehicleId}
      />
    </div>
  );
}
