import { createClient } from "@/lib/supabase/server";
import type {
  SightingOverview,
  StatusHistoryEntry,
  VehicleOverview,
  VehicleStatus,
} from "@/lib/db/database.types";
import { VEHICLE_STATUSES, VEHICLE_PAGE_SIZE } from "@/lib/constants";
import { sanitizeSearchTerm } from "@/lib/utils";
import { readPage, readString, type SearchParams } from "@/lib/queries/params";

export type VehicleSort =
  | "fleet_asc"
  | "fleet_desc"
  | "manufacturer"
  | "model"
  | "year_desc"
  | "year_asc"
  | "latest"
  | "updated";

export type VehicleView = "table" | "grid";

export type VehicleFilters = {
  q: string;
  operator: string;
  manufacturer: string;
  model: string;
  category: string;
  powertrain: string;
  status: VehicleStatus | "";
  sort: VehicleSort;
  view: VehicleView;
  page: number;
};

const SORTS: VehicleSort[] = [
  "fleet_asc",
  "fleet_desc",
  "manufacturer",
  "model",
  "year_desc",
  "year_asc",
  "latest",
  "updated",
];

export function parseVehicleFilters(
  params: SearchParams,
  defaults: { view: VehicleView; sort?: VehicleSort },
): VehicleFilters {
  const sortParam = readString(params, "sort", 20) as VehicleSort;
  const viewParam = readString(params, "view", 10);
  const statusParam = readString(params, "status", 20) as VehicleStatus;

  return {
    q: readString(params, "q", 120),
    operator: readString(params, "operator", 40),
    manufacturer: readString(params, "manufacturer", 120),
    model: readString(params, "model", 120),
    category: readString(params, "category", 60),
    powertrain: readString(params, "powertrain", 60),
    status: VEHICLE_STATUSES.includes(statusParam) ? statusParam : "",
    sort: SORTS.includes(sortParam) ? sortParam : (defaults.sort ?? "fleet_asc"),
    view:
      viewParam === "grid" || viewParam === "table" ? viewParam : defaults.view,
    page: readPage(params),
  };
}

type VehicleSortConfig = {
  column: string;
  ascending: boolean;
};

const SORT_CONFIG: Record<VehicleSort, VehicleSortConfig> = {
  fleet_asc: { column: "fleet_number", ascending: true },
  fleet_desc: { column: "fleet_number", ascending: false },
  manufacturer: { column: "manufacturer", ascending: true },
  model: { column: "model", ascending: true },
  year_desc: { column: "model_year", ascending: false },
  year_asc: { column: "model_year", ascending: true },
  latest: { column: "last_spotted_at", ascending: false },
  updated: { column: "updated_at", ascending: false },
};

export type VehicleListResult = {
  rows: VehicleOverview[];
  count: number;
  page: number;
  pageCount: number;
  pageSize: number;
};

export async function listVehicles(
  filters: VehicleFilters,
  pageSize: number = VEHICLE_PAGE_SIZE,
): Promise<VehicleListResult> {
  const supabase = await createClient();
  let query = supabase
    .from("vehicle_overview")
    .select("*", { count: "exact" });

  const term = sanitizeSearchTerm(filters.q);
  if (term) {
    const pattern = `%${term}%`;
    query = query.or(
      [
        `fleet_number.ilike.${pattern}`,
        `manufacturer.ilike.${pattern}`,
        `model.ilike.${pattern}`,
        `generation.ilike.${pattern}`,
        `operator_name.ilike.${pattern}`,
      ].join(","),
    );
  }
  if (filters.operator) query = query.eq("operator_id", filters.operator);
  if (filters.manufacturer) query = query.eq("manufacturer", filters.manufacturer);
  if (filters.model) query = query.eq("model", filters.model);
  if (filters.category) query = query.eq("vehicle_category", filters.category);
  if (filters.powertrain) query = query.eq("powertrain", filters.powertrain);
  if (filters.status) query = query.eq("status", filters.status);

  const sort = SORT_CONFIG[filters.sort];
  query = query
    .order(sort.column, { ascending: sort.ascending, nullsFirst: false })
    .order("id", { ascending: true });

  const from = (filters.page - 1) * pageSize;
  const { data, count, error } = await query.range(from, from + pageSize - 1);
  if (error) throw new Error(`Could not load the fleet: ${error.message}`);

  const total = count ?? 0;
  return {
    rows: data ?? [],
    count: total,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    pageSize,
  };
}

export type VehicleOption = {
  id: string;
  fleet_number: string | null;
  operator_name: string | null;
  manufacturer: string | null;
  model: string | null;
  status: VehicleStatus;
  last_spotted_at: string | null;
};

export async function listVehicleOptions(): Promise<{
  options: VehicleOption[];
  total: number;
}> {
  const supabase = await createClient();
  const { data, count, error } = await supabase
    .from("vehicle_overview")
    .select(
      "id, fleet_number, operator_name, manufacturer, model, status, last_spotted_at",
      { count: "exact" },
    )
    .order("fleet_number", { ascending: true, nullsFirst: false })
    .limit(2000);

  if (error) throw new Error(`Could not load vehicles: ${error.message}`);
  return { options: data ?? [], total: count ?? 0 };
}

export type VehicleDetail = {
  vehicle: VehicleOverview;
  history: StatusHistoryEntry[];
  sightings: SightingOverview[];
};

export async function getVehicleDetail(
  vehicleId: string,
): Promise<VehicleDetail | null> {
  const supabase = await createClient();

  const { data: vehicle, error } = await supabase
    .from("vehicle_overview")
    .select("*")
    .eq("id", vehicleId)
    .maybeSingle();

  if (error) throw new Error(`Could not load vehicle: ${error.message}`);
  if (!vehicle) return null;

  const [historyResult, sightingsResult] = await Promise.all([
    supabase
      .from("vehicle_status_history")
      .select("*")
      .eq("vehicle_id", vehicleId)
      .order("changed_on", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("sighting_overview")
      .select("*")
      .eq("vehicle_id", vehicleId)
      .order("spotted_at", { ascending: false }),
  ]);

  if (historyResult.error) {
    throw new Error(`Could not load status history: ${historyResult.error.message}`);
  }
  if (sightingsResult.error) {
    throw new Error(`Could not load vehicle sightings: ${sightingsResult.error.message}`);
  }

  return {
    vehicle,
    history: historyResult.data ?? [],
    sightings: sightingsResult.data ?? [],
  };
}

/** All photographs across a vehicle's sightings, newest sighting first. */
export async function getVehiclePhotos(vehicleId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("photo_overview")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("spotted_at", { ascending: false })
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`Could not load photographs: ${error.message}`);
  return data ?? [];
}

export type VehicleSummary = {
  id: string;
  fleet_number: string | null;
  operator_name: string | null;
  model: string | null;
};

export async function getVehicleSummary(
  vehicleId: string,
): Promise<VehicleSummary | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicle_overview")
    .select("id, fleet_number, operator_name, model")
    .eq("id", vehicleId)
    .maybeSingle();
  if (error) throw new Error(`Could not load vehicle: ${error.message}`);
  return data;
}
