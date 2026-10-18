import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeSearchTerm } from "@/lib/utils";
import type { SearchResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

const EMPTY: SearchResponse = { vehicles: [], sightings: [], operators: [] };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const term = sanitizeSearchTerm(url.searchParams.get("q") ?? "");
  if (term.length < 2) {
    return NextResponse.json(EMPTY);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const pattern = `%${term}%`;

  const [vehicles, sightings, operators] = await Promise.all([
    supabase
      .from("vehicle_overview")
      .select("id, fleet_number, operator_name, manufacturer, model")
      .or(
        [
          `fleet_number.ilike.${pattern}`,
          `manufacturer.ilike.${pattern}`,
          `model.ilike.${pattern}`,
          `operator_name.ilike.${pattern}`,
          `generation.ilike.${pattern}`,
        ].join(","),
      )
      .order("fleet_number", { ascending: true, nullsFirst: false })
      .limit(5),
    supabase
      .from("sighting_overview")
      .select("id, vehicle_id, fleet_number, operator_name, spotted_at, route, location_name")
      .or(
        [
          `fleet_number.ilike.${pattern}`,
          `operator_name.ilike.${pattern}`,
          `route.ilike.${pattern}`,
          `location_name.ilike.${pattern}`,
          `notes.ilike.${pattern}`,
          `model.ilike.${pattern}`,
          `manufacturer.ilike.${pattern}`,
        ].join(","),
      )
      .order("spotted_at", { ascending: false })
      .limit(5),
    supabase
      .from("operators")
      .select("id, name, abbreviation")
      .ilike("name", pattern)
      .order("name", { ascending: true })
      .limit(4),
  ]);

  if (vehicles.error || sightings.error || operators.error) {
    console.error("[transitspotter] search failed:", {
      vehicles: vehicles.error,
      sightings: sightings.error,
      operators: operators.error,
    });
    return NextResponse.json(
      { error: "Search is unavailable right now." },
      { status: 500 },
    );
  }

  const payload: SearchResponse = {
    vehicles: vehicles.data ?? [],
    sightings: sightings.data ?? [],
    operators: operators.data ?? [],
  };
  return NextResponse.json(payload);
}
