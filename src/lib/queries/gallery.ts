import { createClient } from "@/lib/supabase/server";
import type { PhotoOverview } from "@/lib/db/database.types";
import { GALLERY_PAGE_SIZE } from "@/lib/constants";
import type { GalleryDensity } from "@/lib/db/database.types";
import { sanitizeSearchTerm } from "@/lib/utils";
import {
  readIsoParam,
  readPage,
  readString,
  type SearchParams,
} from "@/lib/queries/params";

export type GalleryFilters = {
  q: string;
  operator: string;
  manufacturer: string;
  model: string;
  route: string;
  location: string;
  from: string | null;
  to: string | null;
  density: GalleryDensity;
  page: number;
};

const DENSITIES: GalleryDensity[] = ["compact", "comfortable", "spacious"];

export function parseGalleryFilters(
  params: SearchParams,
  defaultDensity: GalleryDensity,
): GalleryFilters {
  const densityParam = readString(params, "density", 20) as GalleryDensity;
  return {
    q: readString(params, "q", 120),
    operator: readString(params, "operator", 40),
    manufacturer: readString(params, "manufacturer", 120),
    model: readString(params, "model", 120),
    route: readString(params, "route", 80),
    location: readString(params, "location", 200),
    from: readIsoParam(params, "from"),
    to: readIsoParam(params, "to", true),
    density: DENSITIES.includes(densityParam) ? densityParam : defaultDensity,
    page: readPage(params),
  };
}

export type GalleryResult = {
  rows: PhotoOverview[];
  count: number;
  page: number;
  pageCount: number;
  pageSize: number;
};

export async function listGalleryPhotos(
  filters: GalleryFilters,
): Promise<GalleryResult> {
  const supabase = await createClient();
  const pageSize = GALLERY_PAGE_SIZE[filters.density];
  let query = supabase.from("photo_overview").select("*", { count: "exact" });

  const term = sanitizeSearchTerm(filters.q);
  if (term) {
    const pattern = `%${term}%`;
    query = query.or(
      [
        `fleet_number.ilike.${pattern}`,
        `operator_name.ilike.${pattern}`,
        `route.ilike.${pattern}`,
        `location_name.ilike.${pattern}`,
        `caption.ilike.${pattern}`,
        `model.ilike.${pattern}`,
        `manufacturer.ilike.${pattern}`,
      ].join(","),
    );
  }
  if (filters.operator) query = query.eq("operator_id", filters.operator);
  if (filters.manufacturer) query = query.eq("manufacturer", filters.manufacturer);
  if (filters.model) query = query.eq("model", filters.model);
  if (filters.route) query = query.eq("route", filters.route);
  if (filters.location) {
    query = query.ilike("location_name", `%${sanitizeSearchTerm(filters.location)}%`);
  }
  if (filters.from) query = query.gte("spotted_at", filters.from);
  if (filters.to) query = query.lte("spotted_at", filters.to);

  query = query
    .order("spotted_at", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  const from = (filters.page - 1) * pageSize;
  const { data, count, error } = await query.range(from, from + pageSize - 1);
  if (error) throw new Error(`Could not load the gallery: ${error.message}`);

  const total = count ?? 0;
  return {
    rows: data ?? [],
    count: total,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    pageSize,
  };
}
