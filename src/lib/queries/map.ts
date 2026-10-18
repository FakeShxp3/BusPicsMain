import { createClient } from "@/lib/supabase/server";
import type { SightingOverview } from "@/lib/db/database.types";
import {
  fetchAllPages,
  readIsoParam,
  readString,
  type SearchParams,
} from "@/lib/queries/params";

export type MapFilters = {
  operator: string;
  model: string;
  route: string;
  from: string | null;
  to: string | null;
};

export function parseMapFilters(params: SearchParams): MapFilters {
  return {
    operator: readString(params, "operator", 40),
    model: readString(params, "model", 120),
    route: readString(params, "route", 80),
    from: readIsoParam(params, "from"),
    to: readIsoParam(params, "to", true),
  };
}

export type MapData = {
  points: SightingOverview[];
  withoutCoordinates: number;
};

export async function listMapSightings(filters: MapFilters): Promise<MapData> {
  const supabase = await createClient();

  const points = await fetchAllPages<SightingOverview>(
    (from, to) => {
      let query = supabase
        .from("sighting_overview")
        .select("*")
        .not("latitude", "is", null)
        .not("longitude", "is", null);
      if (filters.operator) query = query.eq("operator_id", filters.operator);
      if (filters.model) query = query.eq("model", filters.model);
      if (filters.route) query = query.eq("route", filters.route);
      if (filters.from) query = query.gte("spotted_at", filters.from);
      if (filters.to) query = query.lte("spotted_at", filters.to);
      return query
        .order("spotted_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to);
    },
    1000,
    3000,
  );

  let withoutQuery = supabase
    .from("sighting_overview")
    .select("*", { count: "exact", head: true })
    .is("latitude", null);
  if (filters.operator) withoutQuery = withoutQuery.eq("operator_id", filters.operator);
  if (filters.model) withoutQuery = withoutQuery.eq("model", filters.model);
  if (filters.route) withoutQuery = withoutQuery.eq("route", filters.route);
  if (filters.from) withoutQuery = withoutQuery.gte("spotted_at", filters.from);
  if (filters.to) withoutQuery = withoutQuery.lte("spotted_at", filters.to);

  const { count } = await withoutQuery;

  return { points, withoutCoordinates: count ?? 0 };
}
