import {
  csvResponse,
  dateStamp,
  getExportContext,
  loadSightings,
  sightingCsvRows,
} from "@/lib/export-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const context = await getExportContext();
  if (!context) {
    return new Response("Authentication required", { status: 401 });
  }

  try {
    const sightings = await loadSightings(context.supabase);
    return csvResponse(
      `transitspotter-sightings-${dateStamp()}.csv`,
      sightingCsvRows(sightings),
    );
  } catch (error) {
    console.error("[transitspotter] sighting CSV export failed:", error);
    return new Response("The sighting export could not be created.", { status: 500 });
  }
}
