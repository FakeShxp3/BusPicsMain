"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, requireUser } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

const themeSchema = z.enum(["light", "dark", "system"]);

const preferencesSchema = z.object({
  theme: themeSchema,
  date_style: z.enum(["medium", "short", "iso", "long"]),
  time_format: z.enum(["12h", "24h"]),
  units: z.enum(["metric", "imperial"]),
  default_vehicle_view: z.enum(["table", "grid"]),
  default_sighting_view: z.enum(["list", "gallery"]),
  gallery_density: z.enum(["compact", "comfortable", "spacious"]),
  map_center_lat: z.number().min(-90).max(90).nullable(),
  map_center_lng: z.number().min(-180).max(180).nullable(),
  map_zoom: z.number().int().min(1).max(19),
});

const profileSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, "Display name is required")
    .max(80, "Display name must be 80 characters or fewer"),
});

export async function persistTheme(theme: string): Promise<ActionResult> {
  const parsed = themeSchema.safeParse(theme);
  if (!parsed.success) {
    return { ok: false, error: "Unknown theme preference." };
  }

  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_preferences")
    .upsert({ user_id: user.id, theme: parsed.data }, { onConflict: "user_id" });

  if (error) {
    return { ok: false, error: "Could not save the theme preference." };
  }
  return { ok: true, data: undefined };
}

export async function updatePreferences(input: unknown): Promise<ActionResult> {
  const parsed = preferencesSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Some preferences are invalid.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  if (
    (parsed.data.map_center_lat === null) !==
    (parsed.data.map_center_lng === null)
  ) {
    return { ok: false, error: "Map latitude and longitude must be set together." };
  }

  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_preferences")
    .upsert({ user_id: user.id, ...parsed.data }, { onConflict: "user_id" });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

export async function updateProfile(input: unknown): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors = z.flattenError(parsed.error).fieldErrors;
    return {
      ok: false,
      error: fieldErrors.display_name?.[0] ?? "Please check the display name.",
      fieldErrors,
    };
  }

  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .upsert(
      { id: user.id, display_name: parsed.data.display_name, email: user.email },
      { onConflict: "id" },
    );

  if (error) {
    return { ok: false, error: "Could not save your profile." };
  }

  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}
