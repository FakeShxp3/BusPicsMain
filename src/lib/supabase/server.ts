import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type {
  Database,
  Profile,
  UserPreferences,
} from "@/lib/db/database.types";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from "@/lib/env";
import {
  DEFAULT_TIME_ZONE,
  TIME_ZONE_COOKIE,
  resolveTimeZone,
} from "@/lib/format";

/**
 * Request-scoped Supabase client. Cookie writes are attempted for Route
 * Handlers and Server Actions; in Server Components they are ignored because
 * cookies are read-only there (the proxy refreshes the session).
 */
export async function createClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot mutate cookies; the proxy handles refresh.
        }
      },
    },
  });
}

export async function getAuthUser(): Promise<User | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

/** The viewer's display time zone, stored in a cookie by the browser. */
export async function getRequestTimeZone(): Promise<string> {
  const cookieStore = await cookies();
  return resolveTimeZone(
    cookieStore.get(TIME_ZONE_COOKIE)?.value ?? DEFAULT_TIME_ZONE,
  );
}

export async function requireUser(): Promise<User> {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  return user;
}

export const DEFAULT_PREFERENCES: Omit<
  UserPreferences,
  "user_id" | "created_at" | "updated_at"
> = {
  theme: "system",
  date_style: "medium",
  time_format: "12h",
  units: "metric",
  default_vehicle_view: "table",
  default_sighting_view: "list",
  gallery_density: "comfortable",
  map_center_lat: null,
  map_center_lng: null,
  map_zoom: 11,
};

export type ViewerContext = {
  userId: string;
  email: string | null;
  profile: Profile | null;
  preferences: UserPreferences;
  timeZone: string;
};

/**
 * Loads the signed-in user's profile, preferences and display time zone.
 * Missing preference rows fall back to safe defaults so the app works before
 * a user visits Settings.
 */
export const getViewer = cache(async (): Promise<ViewerContext> => {
  const user = await requireUser();
  const supabase = await createClient();
  const cookieStore = await cookies();
  const timeZone = resolveTimeZone(
    cookieStore.get(TIME_ZONE_COOKIE)?.value ?? DEFAULT_TIME_ZONE,
  );

  const [profileResult, preferencesResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("user_preferences").select("*").eq("user_id", user.id).maybeSingle(),
  ]);

  const now = new Date().toISOString();
  const preferences: UserPreferences =
    preferencesResult.data ?? {
      user_id: user.id,
      created_at: now,
      updated_at: now,
      ...DEFAULT_PREFERENCES,
    };

  return {
    userId: user.id,
    email: user.email ?? profileResult.data?.email ?? null,
    profile: profileResult.data,
    preferences,
    timeZone,
  };
});

export function displayName(
  profile: Profile | null,
  email: string | null,
): string {
  return profile?.display_name?.trim() || email?.split("@")[0] || "Spotter";
}
