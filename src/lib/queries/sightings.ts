import { createClient } from "@/lib/supabase/server";
import type { Photo, SightingOverview } from "@/lib/db/database.types";
import { SIGHTING_PAGE_SIZE } from "@/lib/constants";
import { sanitizeSearchTerm } from "@/lib/utils";
import {
  readIsoParam,
  readPage,
  readString,
  type SearchParams,
} from "@/lib/queries/params";

export type SightingSort = "newest" | "oldest" | "fleet_asc" | "fleet_desc";
export type SightingView = "list" | "gallery";

export type SightingFilters = {
  q: string;
  operator: string;
  model: string;
  category: string;
  route: string;
  vehicle: string;
  from: string | null;
  to: string | null;
  sort: SightingSort;
  view: SightingView;
  page: number;
};

const SORTS: SightingSort[] = ["newest", "oldest", "fleet_asc", "fleet_desc"];

export function parseSightingFilters(
  params: SearchParams,
  defaults: { view: SightingView; sort?: SightingSort },
): SightingFilters {
  const sortParam = readString(params, "sort", 20) as SightingSort;
  const viewParam = readString(params, "view", 10);

  return {
    q: readString(params, "q", 120),
    operator: readString(params, "operator", 40),
    model: readString(params, "model", 120),
    category: readString(params, "category", 60),
    route: readString(params, "route", 80),
    vehicle: readString(params, "vehicle", 40),
    from: readIsoParam(params, "from"),
    to: readIsoParam(params, "to", true),
    sort: SORTS.includes(sortParam) ? sortParam : (defaults.sort ?? "newest"),
    view:
      viewParam === "gallery" || viewParam === "list" ? viewParam : defaults.view,
    page: readPage(params),
  };
}

export type SightingListResult = {
  rows: SightingOverview[];
  count: number;
  page: number;
  pageCount: number;
  pageSize: number;
};

export async function listSightings(
  filters: SightingFilters,
  pageSize: number = SIGHTING_PAGE_SIZE,
): Promise<SightingListResult> {
  const supabase = await createClient();
  let query = supabase
    .from("sighting_overview")
    .select("*", { count: "exact" });

  const term = sanitizeSearchTerm(filters.q);
  if (term) {
    const pattern = `%${term}%`;
    query = query.or(
      [
        `fleet_number.ilike.${pattern}`,
        `operator_name.ilike.${pattern}`,
        `route.ilike.${pattern}`,
        `location_name.ilike.${pattern}`,
        `notes.ilike.${pattern}`,
        `model.ilike.${pattern}`,
        `manufacturer.ilike.${pattern}`,
      ].join(","),
    );
  }
  if (filters.operator) query = query.eq("operator_id", filters.operator);
  if (filters.model) query = query.eq("model", filters.model);
  if (filters.category) query = query.eq("vehicle_category", filters.category);
  if (filters.route) query = query.eq("route", filters.route);
  if (filters.vehicle) query = query.eq("vehicle_id", filters.vehicle);
  if (filters.from) query = query.gte("spotted_at", filters.from);
  if (filters.to) query = query.lte("spotted_at", filters.to);

  if (filters.sort === "newest") {
    query = query.order("spotted_at", { ascending: false });
  } else if (filters.sort === "oldest") {
    query = query.order("spotted_at", { ascending: true });
  } else if (filters.sort === "fleet_asc") {
    query = query
      .order("fleet_number", { ascending: true, nullsFirst: false })
      .order("spotted_at", { ascending: false });
  } else {
    query = query
      .order("fleet_number", { ascending: false, nullsFirst: false })
      .order("spotted_at", { ascending: false });
  }
  query = query.order("id", { ascending: true });

  const from = (filters.page - 1) * pageSize;
  const { data, count, error } = await query.range(from, from + pageSize - 1);
  if (error) throw new Error(`Could not load sightings: ${error.message}`);

  const total = count ?? 0;
  return {
    rows: data ?? [],
    count: total,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    pageSize,
  };
}

export async function getSightingDetail(
  sightingId: string,
): Promise<SightingOverview | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sighting_overview")
    .select("*")
    .eq("id", sightingId)
    .maybeSingle();

  if (error) throw new Error(`Could not load sighting: ${error.message}`);
  return data;
}

export async function getSightingPhotos(sightingId: string): Promise<Photo[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("photos")
    .select("*")
    .eq("sighting_id", sightingId)
    .order("is_cover", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Could not load photographs: ${error.message}`);
  return data ?? [];
}

