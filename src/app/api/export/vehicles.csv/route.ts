import {
  csvResponse,
  dateStamp,
  getExportContext,
  loadVehicles,
  vehicleCsvRows,
} from "@/lib/export-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const context = await getExportContext();
  if (!context) {
    return new Response("Authentication required", { status: 401 });
  }

  try {
    const vehicles = await loadVehicles(context.supabase);
    return csvResponse(
      `transitspotter-vehicles-${dateStamp()}.csv`,
      vehicleCsvRows(vehicles),
    );
  } catch (error) {
    console.error("[transitspotter] vehicle CSV export failed:", error);
    return new Response("The vehicle export could not be created.", { status: 500 });
  }
}
