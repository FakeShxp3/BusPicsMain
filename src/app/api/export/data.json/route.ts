import {
  dateStamp,
  getExportContext,
  jsonResponse,
  loadOperators,
  loadPhotos,
  loadSightings,
  loadStatusHistory,
  loadVehicles,
} from "@/lib/export-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const context = await getExportContext();
  if (!context) {
    return new Response("Authentication required", { status: 401 });
  }

  try {
    const [operators, vehicles, sightings, photos, history] = await Promise.all([
      loadOperators(context.supabase),
      loadVehicles(context.supabase),
      loadSightings(context.supabase),
      loadPhotos(context.supabase),
      loadStatusHistory(context.supabase),
    ]);

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();

    const { data: preferences } = await context.supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();

    return jsonResponse(`transitspotter-archive-${dateStamp()}.json`, {
      application: "TransitSpotter",
      schema_version: 1,
      exported_at: new Date().toISOString(),
      includes_binary_files: false,
      binary_file_note:
        "Photograph image files are not embedded in this JSON export. Use the photo archive ZIP or /api/photos/{id}/download for the originals.",
      photo_download_pattern: "/api/photos/{photo_id}/download",
      account: {
        id: context.userId,
        email: context.email,
        profile: profile ?? null,
        preferences: preferences ?? null,
      },
      counts: {
        operators: operators.length,
        vehicles: vehicles.length,
        sightings: sightings.length,
        photos: photos.length,
        status_history: history.length,
      },
      operators,
      vehicles,
      sightings,
      photos,
      status_history: history,
    });
  } catch (error) {
    console.error("[transitspotter] JSON export failed:", error);
    return new Response("The JSON export could not be created.", { status: 500 });
  }
}
