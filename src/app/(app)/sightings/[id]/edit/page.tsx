import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/common/page-header";
import { SightingForm } from "@/components/sightings/sighting-form";
import { getArchiveFacets } from "@/lib/queries/facets";
import { getSightingDetail } from "@/lib/queries/sightings";
import { listVehicleOptions } from "@/lib/queries/vehicles";
import { getViewer } from "@/lib/supabase/server";
import { DEFAULT_MAP_CENTER } from "@/lib/constants";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const metadata: Metadata = { title: "Edit sighting" };

export default async function EditSightingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) notFound();

  const viewer = await getViewer();
  const [sighting, vehicleOptions, facets] = await Promise.all([
    getSightingDetail(id),
    listVehicleOptions(),
    getArchiveFacets(),
  ]);

  if (!sighting) notFound();

  const mapDefaults = {
    latitude: viewer.preferences.map_center_lat ?? DEFAULT_MAP_CENTER.lat,
    longitude: viewer.preferences.map_center_lng ?? DEFAULT_MAP_CENTER.lng,
    zoom: viewer.preferences.map_zoom ?? DEFAULT_MAP_CENTER.zoom,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sightings"
        title={
          sighting.fleet_number
            ? `Edit sighting of fleet #${sighting.fleet_number}`
            : "Edit sighting"
        }
        description="The form is pre-filled with the saved record. Photographs and their captions are managed on the sighting page."
        back={{ href: `/sightings/${sighting.id}`, label: "Back to sighting" }}
      />
      <SightingForm
        mode="edit"
        sighting={sighting}
        vehicles={vehicleOptions.options}
        totalVehicles={vehicleOptions.total}
        operators={facets.operators}
        routes={facets.routes}
        userId={viewer.userId}
        mapDefaults={mapDefaults}
      />
    </div>
  );
}
