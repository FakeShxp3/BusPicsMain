import { ZipArchive } from "archiver";
import { Readable } from "node:stream";
import { getExportContext } from "@/lib/export-data";
import { PHOTO_BUCKET } from "@/lib/env";
import { EXPORT_PHOTO_LIMIT } from "@/lib/constants";
import { formatIsoDay } from "@/lib/format";
import { sanitizeFilename } from "@/lib/utils";
import type { PhotoOverview } from "@/lib/db/database.types";
import { fetchAllPages } from "@/lib/queries/params";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_TOTAL_BYTES = 2 * 1024 * 1024 * 1024;

export async function GET() {
  const context = await getExportContext();
  if (!context) {
    return new Response("Authentication required", { status: 401 });
  }

  let photos: PhotoOverview[];
  try {
    photos = await fetchAllPages<PhotoOverview>(
      (from, to) =>
        context.supabase
          .from("photo_overview")
          .select("*")
          .order("spotted_at", { ascending: true })
          .range(from, to),
      500,
      5000,
    );
  } catch (error) {
    console.error("[transitspotter] photo export query failed:", error);
    return new Response("The photograph export could not be prepared.", { status: 500 });
  }

  if (photos.length === 0) {
    return new Response("There are no photographs to export yet.", { status: 404 });
  }
  if (photos.length > EXPORT_PHOTO_LIMIT) {
    return new Response(
      `This archive has ${photos.length} photographs. The ZIP export is limited to ${EXPORT_PHOTO_LIMIT} originals per download — download photos in batches from the gallery instead.`,
      { status: 413 },
    );
  }

  const totalBytes = photos.reduce((sum, photo) => sum + (photo.file_size ?? 0), 0);
  if (totalBytes > MAX_TOTAL_BYTES) {
    return new Response(
      "This archive is larger than the 2 GB streaming export limit. Download photographs in smaller batches from the gallery.",
      { status: 413 },
    );
  }

  const archive = new ZipArchive({ zlib: { level: 5 } });
  const webStream = Readable.toWeb(
    archive as unknown as Readable,
  ) as ReadableStream<Uint8Array>;

  void (async () => {
    const manifestPhotos: Array<Record<string, unknown>> = [];
    const failed: Array<{ photo_id: string; filename: string; reason: string }> = [];

    for (const photo of photos) {
      const datePart = formatIsoDay(photo.spotted_at, "UTC");
      const fleetPart = photo.fleet_number ? sanitizeFilename(photo.fleet_number) : "vehicle";
      const entryName =
        `photos/${fleetPart}-${datePart}-${photo.id.slice(0, 8)}-${sanitizeFilename(photo.original_filename)}`;

      try {
        const { data, error } = await context.supabase.storage
          .from(PHOTO_BUCKET)
          .download(photo.storage_path);

        if (error || !data) {
          failed.push({
            photo_id: photo.id,
            filename: photo.original_filename,
            reason: error?.message ?? "Object not found",
          });
          continue;
        }

        const buffer = Buffer.from(await data.arrayBuffer());
        archive.append(buffer, { name: entryName });
        manifestPhotos.push({
          photo_id: photo.id,
          file: entryName,
          fleet_number: photo.fleet_number,
          operator: photo.operator_name,
          spotted_at: photo.spotted_at,
          route: photo.route,
          location: photo.location_name,
          caption: photo.caption,
          alt_text: photo.alt_text,
          width: photo.width,
          height: photo.height,
          mime_type: photo.mime_type,
          original_filename: photo.original_filename,
        });
      } catch (error) {
        failed.push({
          photo_id: photo.id,
          filename: photo.original_filename,
          reason: error instanceof Error ? error.message : "Unknown download error",
        });
      }
    }

    archive.append(
      JSON.stringify(
        {
          application: "TransitSpotter",
          exported_at: new Date().toISOString(),
          photo_count: manifestPhotos.length,
          failed_count: failed.length,
          note:
            "Original photographs exported from the private TransitSpotter storage bucket. Metadata is descriptive only; filenames preserve fleet number, date and the original filename.",
          photos: manifestPhotos,
          failed,
        },
        null,
        2,
      ),
      { name: "manifest.json" },
    );

    await archive.finalize();
  })().catch((error: unknown) => {
    console.error("[transitspotter] photo ZIP stream failed:", error);
    archive.destroy(error instanceof Error ? error : undefined);
  });

  return new Response(webStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="transitspotter-photos-${new Date().toISOString().slice(0, 10)}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
