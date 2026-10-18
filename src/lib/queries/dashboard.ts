import { createClient } from "@/lib/supabase/server";
import type { SightingOverview, VehicleOverview } from "@/lib/db/database.types";
import {
  formatMonthKey,
  formatMonthLabel,
  formatIsoDay,
  lastMonthKeys,
} from "@/lib/format";
import { fetchAllPages } from "@/lib/queries/params";
import { listVehicles } from "@/lib/queries/vehicles";
import { listSightings } from "@/lib/queries/sightings";

type AggregateSighting = {
  spotted_at: string;
  vehicle_id: string;
  operator_id: string | null;
  operator_name: string | null;
  route: string | null;
  model: string | null;
  manufacturer: string | null;
  photo_count: number;
};

export type MonthActivity = {
  month: string;
  label: string;
  shortLabel: string;
  sightings: number;
  photos: number;
};

export type OperatorShare = {
  operatorId: string | null;
  name: string;
  count: number;
};

export type ModelShare = {
  model: string;
  manufacturer: string | null;
  sightings: number;
  photos: number;
};

export type MapPoint = {
  id: string;
  sightingId: string;
  vehicleId: string;
  latitude: number;
  longitude: number;
  fleetNumber: string | null;
  spottedAt: string;
  route: string | null;
  locationName: string | null;
  coverPath: string | null;
};

export type DashboardData = {
  counts: {
    sightings: number;
    vehicles: number;
    photos: number;
    operators: number;
    photographedVehicles: number;
  };
  recentSightings: SightingOverview[];
  recentVehicles: VehicleOverview[];
  recentlyUpdated: VehicleOverview[];
  activity: MonthActivity[];
  operatorBreakdown: OperatorShare[];
  topModels: ModelShare[];
  mapPoints: MapPoint[];
  routeCount: number;
  activeDays: number;
};

export async function getDashboardData(timeZone: string): Promise<DashboardData> {
  const supabase = await createClient();

  const [
    sightingsCount,
    vehiclesCount,
    photosCount,
    recentSightings,
    recentVehicles,
    recentlyUpdated,
    allSightings,
    vehicleOperatorRows,
    mapRows,
  ] = await Promise.all([
    supabase.from("sightings").select("*", { count: "exact", head: true }),
    supabase.from("vehicles").select("*", { count: "exact", head: true }),
    supabase.from("photos").select("*", { count: "exact", head: true }),
    listSightings(
      {
        q: "",
        operator: "",
        model: "",
        category: "",
        route: "",
        vehicle: "",
        from: null,
        to: null,
        sort: "newest",
        view: "list",
        page: 1,
      },
      5,
    ),
    listVehicles(
      {
        q: "",
        operator: "",
        manufacturer: "",
        model: "",
        category: "",
        powertrain: "",
        status: "",
        sort: "latest",
        view: "table",
        page: 1,
      },
      4,
    ),
    listVehicles(
      {
        q: "",
        operator: "",
        manufacturer: "",
        model: "",
        category: "",
        powertrain: "",
        status: "",
        sort: "updated",
        view: "table",
        page: 1,
      },
      5,
    ),
    fetchAllPages<AggregateSighting>((from, to) =>
      supabase
        .from("sighting_overview")
        .select(
          "spotted_at, vehicle_id, operator_id, operator_name, route, model, manufacturer, photo_count",
        )
        .range(from, to),
    ).catch((error: unknown) => {
      console.error("[transitspotter] could not aggregate sightings:", error);
      return [] as AggregateSighting[];
    }),
    fetchAllPages<{ operator_id: string | null }>((from, to) =>
      supabase.from("vehicles").select("operator_id").range(from, to),
    ),
    supabase
      .from("sighting_overview")
      .select(
        "id, vehicle_id, latitude, longitude, fleet_number, spotted_at, route, location_name, cover_storage_path",
      )
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .order("spotted_at", { ascending: false })
      .limit(40),
  ]);

  if (sightingsCount.error) {
    throw new Error(`Could not count sightings: ${sightingsCount.error.message}`);
  }
  if (vehiclesCount.error) {
    throw new Error(`Could not count vehicles: ${vehiclesCount.error.message}`);
  }
  if (photosCount.error) {
    throw new Error(`Could not count photographs: ${photosCount.error.message}`);
  }

  const monthKeys = lastMonthKeys(12, timeZone);
  const monthSet = new Set(monthKeys);
  const activityMap = new Map<string, { sightings: number; photos: number }>();
  for (const key of monthKeys) activityMap.set(key, { sightings: 0, photos: 0 });

  const operatorMap = new Map<string, OperatorShare>();
  const modelMap = new Map<string, ModelShare>();
  const photographedVehicleIds = new Set<string>();
  const routeSet = new Set<string>();
  const daySet = new Set<string>();

  for (const row of allSightings) {
    const month = formatMonthKey(row.spotted_at, timeZone);
    if (monthSet.has(month)) {
      const bucket = activityMap.get(month);
      if (bucket) {
        bucket.sightings += 1;
        bucket.photos += row.photo_count ?? 0;
      }
    }

    if (row.operator_id) {
      const existing = operatorMap.get(row.operator_id);
      if (existing) existing.count += 1;
      else {
        operatorMap.set(row.operator_id, {
          operatorId: row.operator_id,
          name: row.operator_name ?? "Operator",
          count: 1,
        });
      }
    }

    if (row.model) {
      const key = `${row.manufacturer ?? ""}|${row.model}`;
      const existing = modelMap.get(key);
      if (existing) {
        existing.sightings += 1;
        existing.photos += row.photo_count ?? 0;
      } else {
        modelMap.set(key, {
          model: row.model,
          manufacturer: row.manufacturer ?? null,
          sightings: 1,
          photos: row.photo_count ?? 0,
        });
      }
    }

    photographedVehicleIds.add(row.vehicle_id);
    if (row.route) routeSet.add(row.route);
    daySet.add(formatIsoDay(row.spotted_at, timeZone));
  }

  const operatorIds = new Set(
    vehicleOperatorRows
      .map((row) => row.operator_id)
      .filter((value): value is string => Boolean(value)),
  );

  const activity: MonthActivity[] = monthKeys.map((key) => {
    const bucket = activityMap.get(key) ?? { sightings: 0, photos: 0 };
    return {
      month: key,
      label: formatMonthLabel(key),
      shortLabel: formatMonthLabel(key).split(" ")[0] ?? key,
      sightings: bucket.sightings,
      photos: bucket.photos,
    };
  });

  const operatorBreakdown = Array.from(operatorMap.values()).sort(
    (a, b) => b.count - a.count,
  );

  const topModels = Array.from(modelMap.values())
    .sort((a, b) => b.photos - a.photos || b.sightings - a.sightings)
    .slice(0, 5);

  const mapPoints: MapPoint[] = (mapRows.data ?? [])
    .filter(
      (row): row is typeof row & { latitude: number; longitude: number } =>
        row.latitude !== null && row.longitude !== null,
    )
    .map((row) => ({
      id: row.id,
      sightingId: row.id,
      vehicleId: row.vehicle_id,
      latitude: row.latitude,
      longitude: row.longitude,
      fleetNumber: row.fleet_number,
      spottedAt: row.spotted_at,
      route: row.route,
      locationName: row.location_name,
      coverPath: row.cover_storage_path,
    }));

  return {
    counts: {
      sightings: sightingsCount.count ?? 0,
      vehicles: vehiclesCount.count ?? 0,
      photos: photosCount.count ?? 0,
      operators: operatorIds.size,
      photographedVehicles: photographedVehicleIds.size,
    },
    recentSightings: recentSightings.rows,
    recentVehicles: recentVehicles.rows,
    recentlyUpdated: recentlyUpdated.rows,
    activity,
    operatorBreakdown,
    topModels,
    mapPoints,
    routeCount: routeSet.size,
    activeDays: daySet.size,
  };
}
