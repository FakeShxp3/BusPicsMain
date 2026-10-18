"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, requireUser } from "@/lib/supabase/server";
import { bulkDeleteSchema, sightingSchema } from "@/lib/validation/schemas";
import type { ActionResult } from "@/lib/types";
import {
  dbFailure,
  invalidInput,
  notFoundFailure,
} from "@/lib/actions/shared";
import {
  getPhotoPathsForSightings,
  removeStorageObjects,
} from "@/lib/storage-server";

const idSchema = z.string().uuid("Invalid sighting identifier");

function revalidateSightingSurfaces(sightingId?: string) {
  revalidatePath("/sightings");
  revalidatePath("/dashboard");
  revalidatePath("/map");
  revalidatePath("/gallery");
  revalidatePath("/stats");
  revalidatePath("/fleet");
  if (sightingId) {
    revalidatePath(`/sightings/${sightingId}`);
    revalidatePath(`/sightings/${sightingId}/edit`);
  }
}

export async function createSighting(
  input: unknown,
): Promise<ActionResult<{ id: string; vehicleId: string }>> {
  const parsed = sightingSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sightings")
    .insert({ user_id: user.id, ...parsed.data })
    .select("id, vehicle_id")
    .single();

  if (error) return dbFailure("create sighting", error);

  revalidateSightingSurfaces(data.id);
  revalidatePath(`/fleet/${data.vehicle_id}`);
  return { ok: true, data: { id: data.id, vehicleId: data.vehicle_id } };
}

export async function updateSighting(
  sightingId: string,
  input: unknown,
): Promise<ActionResult<{ id: string; vehicleId: string }>> {
  const id = idSchema.safeParse(sightingId);
  if (!id.success) return notFoundFailure("Invalid sighting identifier.");
  const parsed = sightingSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sightings")
    .update(parsed.data)
    .eq("id", id.data)
    .select("id, vehicle_id")
    .maybeSingle();

  if (error) return dbFailure("update sighting", error);
  if (!data) return notFoundFailure("Sighting not found.");

  revalidateSightingSurfaces(data.id);
  revalidatePath(`/fleet/${data.vehicle_id}`);
  return { ok: true, data: { id: data.id, vehicleId: data.vehicle_id } };
}

export async function deleteSightings(
  ids: string[],
): Promise<ActionResult<{ deleted: number; storageFailures: number }>> {
  const parsed = bulkDeleteSchema.safeParse({ ids });
  if (!parsed.success) return invalidInput(parsed.error);

  await requireUser();
  const supabase = await createClient();

  const paths = await getPhotoPathsForSightings(parsed.data.ids);
  const failures = await removeStorageObjects(paths);

  const { data, error } = await supabase
    .from("sightings")
    .delete()
    .in("id", parsed.data.ids)
    .select("id");

  if (error) return dbFailure("delete sightings", error);

  revalidateSightingSurfaces();
  return {
    ok: true,
    data: { deleted: data?.length ?? 0, storageFailures: failures.length },
  };
}
