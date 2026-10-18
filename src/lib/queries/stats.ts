import { createClient } from "@/lib/supabase/server";
import type { VehicleStatus } from "@/lib/db/database.types";
import {
  formatIsoDay,
  formatMonthKey,
  formatMonthLabel,
  monthRange,
} from "@/lib/format";
import {
  fetchAllPages,
  readIsoParam,
  readString,
  type SearchParams,
} from "@/lib/queries/params";

export type StatsFilters = {
  from: string | null;
  to: string | null;
  operator: string;
  category: string;
};

export function parseStatsFilters(params: SearchParams): StatsFilters {
  return {
    from: readIsoParam(params, "from"),
    to: readIsoParam(params, "to", true),
    operator: readString(params, "operator", 40),
    category: readString(params, "category", 60),
  };
}

type StatsSightingRow = {
  spotted_at: string;
  vehicle_id: string;
  fleet_number: string | null;
  operator_id: string | null;
  operator_name: string | null;
  route: string | null;
  model: string | null;
  manufacturer: string | null;
  vehicle_category: string | null;
  powertrain: string | null;
  photo_count: number;
};

type StatsVehicleRow = {
  id: string;
  vehicle_category: string | null;
  powertrain: string | null;
  status: VehicleStatus;
  operator_id: string | null;
};

export type StatsMonthPoint = {
  month: string;
  label: string;
  sightings: number;
  photos: number;
};

export type NamedCount = { name: string; count: number };

export type StatsData = {
  totals: {
    sightings: number;
    photos: number;
    uniqueVehicles: number;
    routes: number;
    activeDays: number;
  };
  monthly: StatsMonthPoint[];
  byOperator: { operatorId: string | null; name: string; count: number; photos: number }[];
  byRoute: NamedCount[];
  byModel: { model: string; manufacturer: string | null; sightings: number; photos: number }[];
  topVehicles: {
    vehicleId: string;
    fleetNumber: string | null;
    model: string | null;
    operatorName: string | null;
    sightings: number;
    photos: number;
  }[];
  distribution: {
    categories: NamedCount[];
    powertrains: NamedCount[];
    statuses: NamedCount[];
  };
  coverage: {
    cataloged: number;
    photographed: number;
    withoutSightings: number;
    percent: number;
  };
  hasData: boolean;
};

const STATUS_LABELS: Record<VehicleStatus, string> = {
  active: "Active",
  retired: "Retired",
  scrapped: "Scrapped",
  transferred: "Transferred",
  unknown: "Unknown",
};

export async function getStats(
  filters: StatsFilters,
  timeZone: string,
): Promise<StatsData> {
  const supabase = await createClient();

  const [sightings, vehicles] = await Promise.all([
    fetchAllPages<StatsSightingRow>((from, to) => {
      let query = supabase
        .from("sighting_overview")
        .select(
          "spotted_at, vehicle_id, fleet_number, operator_id, operator_name, route, model, manufacturer, vehicle_category, powertrain, photo_count",
        );
      if (filters.from) query = query.gte("spotted_at", filters.from);
      if (filters.to) query = query.lte("spotted_at", filters.to);
      if (filters.operator) query = query.eq("operator_id", filters.operator);
      if (filters.category) query = query.eq("vehicle_category", filters.category);
      return query.range(from, to);
    }),
    fetchAllPages<StatsVehicleRow>((from, to) => {
      let query = supabase
        .from("vehicles")
        .select("id, vehicle_category, powertrain, status, operator_id");
      if (filters.operator) query = query.eq("operator_id", filters.operator);
      if (filters.category) query = query.eq("vehicle_category", filters.category);
      return query.range(from, to);
    }),
  ]);

  const photoTotal = sightings.reduce((sum, row) => sum + (row.photo_count ?? 0), 0);
  const vehicleIds = new Set(sightings.map((row) => row.vehicle_id));
  const routeSet = new Set(
    sightings.map((row) => row.route).filter((route): route is string => Boolean(route)),
  );
  const daySet = new Set(
    sightings.map((row) => formatIsoDay(row.spotted_at, timeZone)),
  );

  const operatorMap = new Map<
    string,
    { operatorId: string | null; name: string; count: number; photos: number }
  >();
  const routeMap = new Map<string, number>();
  const modelMap = new Map<
    string,
    { model: string; manufacturer: string | null; sightings: number; photos: number }
  >();
  const vehicleMap = new Map<
    string,
    {
      vehicleId: string;
      fleetNumber: string | null;
      model: string | null;
      operatorName: string | null;
      sightings: number;
      photos: number;
    }
  >();
  const monthMap = new Map<string, { sightings: number; photos: number }>();
  let minMonth = "";
  let maxMonth = "";

  for (const row of sightings) {
    const operatorKey = row.operator_id ?? "__none__";
    const operator = operatorMap.get(operatorKey);
    if (operator) {
      operator.count += 1;
      operator.photos += row.photo_count ?? 0;
    } else {
      operatorMap.set(operatorKey, {
        operatorId: row.operator_id,
        name: row.operator_name ?? "No operator",
        count: 1,
        photos: row.photo_count ?? 0,
      });
    }

    const routeKey = row.route ?? "Unspecified";
    routeMap.set(routeKey, (routeMap.get(routeKey) ?? 0) + 1);

    if (row.model) {
      const modelKey = `${row.manufacturer ?? ""}|${row.model}`;
      const model = modelMap.get(modelKey);
      if (model) {
        model.sightings += 1;
        model.photos += row.photo_count ?? 0;
      } else {
        modelMap.set(modelKey, {
          model: row.model,
          manufacturer: row.manufacturer,
          sightings: 1,
          photos: row.photo_count ?? 0,
        });
      }
    }

    const vehicle = vehicleMap.get(row.vehicle_id);
    if (vehicle) {
      vehicle.sightings += 1;
      vehicle.photos += row.photo_count ?? 0;
    } else {
      vehicleMap.set(row.vehicle_id, {
        vehicleId: row.vehicle_id,
        fleetNumber: row.fleet_number,
        model: row.model,
        operatorName: row.operator_name,
        sightings: 1,
        photos: row.photo_count ?? 0,
      });
    }

    const month = formatMonthKey(row.spotted_at, timeZone);
    if (!minMonth || month < minMonth) minMonth = month;
    if (!maxMonth || month > maxMonth) maxMonth = month;
    const monthBucket = monthMap.get(month);
    if (monthBucket) {
      monthBucket.sightings += 1;
      monthBucket.photos += row.photo_count ?? 0;
    } else {
      monthMap.set(month, { sightings: 1, photos: row.photo_count ?? 0 });
    }
  }

  const months = minMonth && maxMonth ? monthRange(minMonth, maxMonth, 120) : [];
  const monthly: StatsMonthPoint[] = months.map((month) => {
    const bucket = monthMap.get(month) ?? { sightings: 0, photos: 0 };
    return {
      month,
      label: formatMonthLabel(month),
      sightings: bucket.sightings,
      photos: bucket.photos,
    };
  });

  const categoryMap = new Map<string, number>();
  const powertrainMap = new Map<string, number>();
  const statusMap = new Map<string, number>();
  for (const vehicle of vehicles) {
    const category = vehicle.vehicle_category ?? "Unspecified";
    categoryMap.set(category, (categoryMap.get(category) ?? 0) + 1);
    const powertrain = vehicle.powertrain ?? "Unspecified";
    powertrainMap.set(powertrain, (powertrainMap.get(powertrain) ?? 0) + 1);
    const status = STATUS_LABELS[vehicle.status] ?? "Unknown";
    statusMap.set(status, (statusMap.get(status) ?? 0) + 1);
  }

  const toNamedCounts = (map: Map<string, number>): NamedCount[] =>
    Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const cataloged = vehicles.length;
  const photographedCataloged = vehicles.filter((vehicle) =>
    vehicleIds.has(vehicle.id),
  ).length;

  return {
    totals: {
      sightings: sightings.length,
      photos: photoTotal,
      uniqueVehicles: vehicleIds.size,
      routes: routeSet.size,
      activeDays: daySet.size,
    },
    monthly,
    byOperator: Array.from(operatorMap.values()).sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name),
    ),
    byRoute: toNamedCounts(routeMap).slice(0, 10),
    byModel: Array.from(modelMap.values())
      .sort((a, b) => b.sightings - a.sightings || b.photos - a.photos)
      .slice(0, 8),
    topVehicles: Array.from(vehicleMap.values())
      .sort((a, b) => b.sightings - a.sightings || b.photos - a.photos)
      .slice(0, 8),
    distribution: {
      categories: toNamedCounts(categoryMap),
      powertrains: toNamedCounts(powertrainMap),
      statuses: toNamedCounts(statusMap),
    },
    coverage: {
      cataloged,
      photographed: photographedCataloged,
      withoutSightings: Math.max(0, cataloged - photographedCataloged),
      percent: cataloged > 0 ? Math.round((photographedCataloged / cataloged) * 100) : 0,
    },
    hasData: sightings.length > 0 || cataloged > 0,
  };
}
