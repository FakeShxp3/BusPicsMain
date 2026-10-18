import { createClient } from "@/lib/supabase/server";
import { PHOTO_BUCKET } from "@/lib/env";

export function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export async function getPhotoPathsForSightings(
  sightingIds: string[],
): Promise<string[]> {
  if (sightingIds.length === 0) return [];
  const supabase = await createClient();
  const paths: string[] = [];
  for (const group of chunk(sightingIds, 80)) {
    const { data, error } = await supabase
      .from("photos")
      .select("storage_path")
      .in("sighting_id", group);
    if (error) {
      console.error("[transitspotter] could not list photo paths:", error);
      continue;
    }
    for (const row of data ?? []) paths.push(row.storage_path);
  }
  return paths;
}

/**
 * Removes objects from the private bucket. Returns human-readable failures so
 * callers can warn the user instead of silently leaving files behind.
 */
export async function removeStorageObjects(paths: string[]): Promise<string[]> {
  if (paths.length === 0) return [];
  const supabase = await createClient();
  const failures: string[] = [];
  for (const group of chunk(paths, 100)) {
    const { error } = await supabase.storage.from(PHOTO_BUCKET).remove(group);
    if (error) failures.push(error.message);
  }
  return failures;
}

export function isOwnedStoragePath(path: string, userId: string, sightingId: string): boolean {
  const [folder, sightingFolder] = path.split("/");
  return folder === userId && sightingFolder === sightingId && path.length > 80;
}
