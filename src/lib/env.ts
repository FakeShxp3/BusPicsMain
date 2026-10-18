/**
 * Public runtime configuration. Only NEXT_PUBLIC_* values are read here;
 * secrets must never be imported into client-reachable modules.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
// TransitSpotter keeps its tables and views in a dedicated schema so it can
// share a Supabase project with other applications without collisions.
export const DB_SCHEMA = "transitspotter" as const;
export const PHOTO_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_PHOTO_BUCKET || "transitspotter-photos";

const parsedMaxUploadMb = Number.parseInt(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB ?? "15", 10);
export const MAX_UPLOAD_MB = Number.isFinite(parsedMaxUploadMb) && parsedMaxUploadMb > 0
  ? parsedMaxUploadMb
  : 15;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

export const isSupabaseConfigured =
  SUPABASE_URL.startsWith("http") && SUPABASE_ANON_KEY.length > 20;

export const MISSING_CONFIG_MESSAGE =
  "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local (see .env.example) and restart the development server.";

export function assertSupabaseConfigured(): void {
  if (!isSupabaseConfigured) {
    throw new Error(MISSING_CONFIG_MESSAGE);
  }
}

export function isPhotoBucketConfigured(): boolean {
  return PHOTO_BUCKET.trim().length > 0;
}
