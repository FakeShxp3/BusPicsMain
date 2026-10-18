import { createClient } from "@/lib/supabase/server";
import { PHOTO_BUCKET } from "@/lib/env";
import { SIGNED_URL_TTL_SECONDS as TTL } from "@/lib/constants";

const CHUNK_SIZE = 100;

/**
 * Creates short-lived signed URLs for private archive objects. Paths are
 * de-duplicated and requests are chunked to stay within the storage API limits.
 */
export async function getSignedUrlMap(
  paths: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const uniquePaths = Array.from(
    new Set(paths.filter((path): path is string => Boolean(path))),
  );
  const result = new Map<string, string>();
  if (uniquePaths.length === 0) return result;

  const supabase = await createClient();
  for (let index = 0; index < uniquePaths.length; index += CHUNK_SIZE) {
    const group = uniquePaths.slice(index, index + CHUNK_SIZE);
    const { data, error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrls(group, TTL);
    if (error) {
      console.error("[transitspotter] could not sign photo URLs:", error);
      continue;
    }
    for (const item of data ?? []) {
      if (item.path && item.signedUrl) result.set(item.path, item.signedUrl);
    }
  }
  return result;
}

export async function getSignedFileUrl(
  path: string,
  downloadName?: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(
      path,
      downloadName ? 120 : TTL,
      downloadName ? { download: downloadName } : undefined,
    );
  if (error) return null;
  return data?.signedUrl ?? null;
}
