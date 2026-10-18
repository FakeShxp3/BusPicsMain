import Papa from "papaparse";
import { createClient } from "@/lib/supabase/server";
import { fetchAllPages } from "@/lib/queries/params";
import type {
  Operator,
  PhotoOverview,
  SightingOverview,
  StatusHistoryEntry,
  VehicleOverview,
} from "@/lib/db/database.types";

export type ExportContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  email: string | null;
};

/** Resolves the signed-in user or returns null so routes can answer 401. */
export async function getExportContext(): Promise<ExportContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { supabase, userId: user.id, email: user.email ?? null };
}

export function csvResponse(
  filename: string,
  rows: Record<string, unknown>[],
): Response {
  const csv = Papa.unparse(rows, { quotes: false, newline: "\r\n" });
  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export function jsonResponse(filename: string, data: unknown): Response {
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function loadVehicles(
  supabase: ExportContext["supabase"],
): Promise<VehicleOverview[]> {
  return fetchAllPages<VehicleOverview>((from, to) =>
    supabase
      .from("vehicle_overview")
      .select("*")
      .order("created_at", { ascending: true })
      .range(from, to),
  );
}

export async function loadSightings(
  supabase: ExportContext["supabase"],
): Promise<SightingOverview[]> {
  return fetchAllPages<SightingOverview>((from, to) =>
    supabase
      .from("sighting_overview")
      .select("*")
      .order("spotted_at", { ascending: true })
      .range(from, to),
  );
}

export async function loadOperators(
  supabase: ExportContext["supabase"],
): Promise<Operator[]> {
  return fetchAllPages<Operator>((from, to) =>
    supabase
      .from("operators")
      .select("*")
      .order("name", { ascending: true })
      .range(from, to),
  );
}

export async function loadPhotos(
  supabase: ExportContext["supabase"],
): Promise<PhotoOverview[]> {
  return fetchAllPages<PhotoOverview>((from, to) =>
    supabase
      .from("photo_overview")
      .select("*")
      .order("spotted_at", { ascending: false })
      .range(from, to),
  );
}

export async function loadStatusHistory(
  supabase: ExportContext["supabase"],
): Promise<StatusHistoryEntry[]> {
  return fetchAllPages<StatusHistoryEntry>((from, to) =>
    supabase
      .from("vehicle_status_history")
      .select("*")
      .order("changed_on", { ascending: true })
      .range(from, to),
  );
}

export function vehicleCsvRows(vehicles: VehicleOverview[]) {
  return vehicles.map((vehicle) => ({
    vehicle_id: vehicle.id,
    operator: vehicle.operator_name ?? "",
    operator_abbreviation: vehicle.operator_abbreviation ?? "",
    fleet_number: vehicle.fleet_number ?? "",
    manufacturer: vehicle.manufacturer ?? "",
    model: vehicle.model ?? "",
    generation: vehicle.generation ?? "",
    category: vehicle.vehicle_category ?? "",
    powertrain: vehicle.powertrain ?? "",
    length_m: vehicle.length_m ?? "",
    model_year: vehicle.model_year ?? "",
    in_service_year: vehicle.in_service_year ?? "",
    status: vehicle.status,
    status_verified_on: vehicle.status_verified_on ?? "",
    sightings: vehicle.sighting_count,
    photographs: vehicle.photo_count,
    first_sighted: vehicle.first_spotted_at ?? "",
    last_sighted: vehicle.last_spotted_at ?? "",
    routes: vehicle.routes.join("; "),
    notes: vehicle.notes ?? "",
    cover_photo_id: vehicle.cover_photo_id ?? "",
    created_at: vehicle.created_at,
    updated_at: vehicle.updated_at,
  }));
}

export function sightingCsvRows(sightings: SightingOverview[]) {
  return sightings.map((sighting) => ({
    sighting_id: sighting.id,
    spotted_at: sighting.spotted_at,
    vehicle_id: sighting.vehicle_id,
    fleet_number: sighting.fleet_number ?? "",
    operator: sighting.operator_name ?? "",
    manufacturer: sighting.manufacturer ?? "",
    model: sighting.model ?? "",
    route: sighting.route ?? "",
    direction: sighting.direction ?? "",
    location_name: sighting.location_name ?? "",
    latitude: sighting.latitude ?? "",
    longitude: sighting.longitude ?? "",
    camera_model: sighting.camera_model ?? "",
    lens: sighting.lens ?? "",
    aperture: sighting.aperture ?? "",
    shutter_speed: sighting.shutter_speed ?? "",
    iso: sighting.iso ?? "",
    focal_length: sighting.focal_length ?? "",
    weather: sighting.weather ?? "",
    notes: sighting.notes ?? "",
    photo_count: sighting.photo_count,
    created_at: sighting.created_at,
    updated_at: sighting.updated_at,
  }));
}
