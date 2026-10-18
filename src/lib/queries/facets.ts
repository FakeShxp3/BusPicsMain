import { createClient } from "@/lib/supabase/server";
import { unique } from "@/lib/utils";
import { fetchAllPages } from "@/lib/queries/params";

export type OperatorOption = {
  id: string;
  name: string;
  abbreviation: string | null;
};

export type ArchiveFacets = {
  operators: OperatorOption[];
  manufacturers: string[];
  models: string[];
  categories: string[];
  powertrains: string[];
  routes: string[];
};

function sortedUnique(values: (string | null)[]): string[] {
  return unique(
    values
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value)),
  ).sort((a, b) => a.localeCompare(b));
}

export async function getOperatorOptions(): Promise<OperatorOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("operators")
    .select("id, name, abbreviation")
    .order("name", { ascending: true });
  if (error) throw new Error(`Could not load operators: ${error.message}`);
  return data ?? [];
}

export async function getArchiveFacets(): Promise<ArchiveFacets> {
  const supabase = await createClient();

  const [operators, vehicles, routes] = await Promise.all([
    supabase
      .from("operators")
      .select("id, name, abbreviation")
      .order("name", { ascending: true }),
    fetchAllPages<{
      manufacturer: string | null;
      model: string | null;
      vehicle_category: string | null;
      powertrain: string | null;
    }>((from, to) =>
      supabase
        .from("vehicles")
        .select("manufacturer, model, vehicle_category, powertrain")
        .range(from, to),
    ),
    fetchAllPages<{ route: string | null }>((from, to) =>
      supabase
        .from("sightings")
        .select("route")
        .not("route", "is", null)
        .order("spotted_at", { ascending: false })
        .range(from, to),
      1000,
      5000,
    ),
  ]);

  if (operators.error) {
    throw new Error(`Could not load operators: ${operators.error.message}`);
  }

  return {
    operators: operators.data ?? [],
    manufacturers: sortedUnique(vehicles.map((vehicle) => vehicle.manufacturer)),
    models: sortedUnique(vehicles.map((vehicle) => vehicle.model)),
    categories: sortedUnique(vehicles.map((vehicle) => vehicle.vehicle_category)),
    powertrains: sortedUnique(vehicles.map((vehicle) => vehicle.powertrain)),
    routes: sortedUnique(routes.map((row) => row.route)),
  };
}
