"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";
import {
  DB_SCHEMA,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  assertSupabaseConfigured,
} from "@/lib/env";

let browserClient: SupabaseClient<Database> | undefined;

/**
 * Single browser client for the tab. The publishable key is public by design;
 * every table and storage object is guarded by Row Level Security.
 */
export function createClient(): SupabaseClient<Database> {
  assertSupabaseConfigured();
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      db: { schema: DB_SCHEMA },
    });
  }
  return browserClient;
}
