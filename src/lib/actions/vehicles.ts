"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createClient,
  getRequestTimeZone,
  requireUser,
} from "@/lib/supabase/server";
import {
  statusChangeSchema,
  vehicleCoverSchema,
  vehicleCreateSchema,
  vehicleUpdateSchema,
} from "@/lib/validation/schemas";
import type { ActionResult } from "@/lib/types";
import { formatIsoDay } from "@/lib/format";
import {
  conflictFailure,
  dbFailure,
  invalidInput,
  isUniqueViolation,
  notFoundFailure,
} from "@/lib/actions/shared";
import {
  getPhotoPathsForSightings,
  removeStorageObjects,
} from "@/lib/storage-server";

const idSchema = z.string().uuid("Invalid vehicle identifier");

function revalidateVehicleSurfaces(vehicleId?: string) {
  revalidatePath("/fleet");
  revalidatePath("/sightings");
  revalidatePath("/map");
  revalidatePath("/gallery");
  revalidatePath("/stats");
  revalidatePath("/dashboard");
  revalidatePath("/operators");
  if (vehicleId) {
    revalidatePath(`/fleet/${vehicleId}`);
    revalidatePath(`/fleet/${vehicleId}/edit`);
  }
}

export async function createVehicle(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = vehicleCreateSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const user = await requireUser();
  const timeZone = await getRequestTimeZone();
  const supabase = await createClient();
  const { status, status_verified_on, status_note, ...core } = parsed.data;

  const { data, error } = await supabase
    .from("vehicles")
    .insert({
      user_id: user.id,
      ...core,
      status,
      status_verified_on,
    })
    .select("id")
    .single();

  if (error) {
    if (isUniqueViolation(error)) {
      return conflictFailure(
        "This fleet number is already recorded for that operator.",
        "fleet_number",
      );
    }
    return dbFailure("create vehicle", error);
  }

  const shouldRecordHistory =
    status !== "unknown" || status_verified_on !== null || Boolean(status_note);
  if (shouldRecordHistory) {
    const { error: historyError } = await supabase
      .from("vehicle_status_history")
      .insert({
        user_id: user.id,
        vehicle_id: data.id,
        previous_status: null,
        new_status: status,
        changed_on: status_verified_on ?? formatIsoDay(new Date(), timeZone),
        notes: status_note,
      });
    if (historyError) {
      console.error(
        "[transitspotter] vehicle created without initial status history:",
        historyError,
      );
    }
  }

  revalidateVehicleSurfaces(data.id);
  return { ok: true, data: { id: data.id } };
}

export async function updateVehicle(
  vehicleId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const id = idSchema.safeParse(vehicleId);
  if (!id.success) return notFoundFailure("Invalid vehicle identifier.");
  const parsed = vehicleUpdateSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .update(parsed.data)
    .eq("id", id.data)
    .select("id")
    .maybeSingle();

  if (error) {
    if (isUniqueViolation(error)) {
      return conflictFailure(
        "This fleet number is already recorded for that operator.",
        "fleet_number",
      );
    }
    return dbFailure("update vehicle", error);
  }
  if (!data) return notFoundFailure("Vehicle not found.");

  revalidateVehicleSurfaces(id.data);
  return { ok: true, data: { id: data.id } };
}

export async function changeVehicleStatus(
  vehicleId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const id = idSchema.safeParse(vehicleId);
  if (!id.success) return notFoundFailure("Invalid vehicle identifier.");
  const parsed = statusChangeSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  await requireUser();
  const timeZone = await getRequestTimeZone();
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_vehicle_status", {
    p_vehicle_id: id.data,
    p_status: parsed.data.status,
    p_changed_on:
      parsed.data.changed_on ?? formatIsoDay(new Date(), timeZone),
    p_notes: parsed.data.notes,
  });

  if (error) {
    if (/not found/i.test(error.message)) {
      return notFoundFailure("Vehicle not found.");
    }
    return dbFailure("record vehicle status", error);
  }

  revalidateVehicleSurfaces(id.data);
  return { ok: true, data: { id: id.data } };
}

export async function setVehicleCover(
  vehicleId: string,
  input: unknown,
): Promise<ActionResult<{ photoId: string | null }>> {
  const id = idSchema.safeParse(vehicleId);
  if (!id.success) return notFoundFailure("Invalid vehicle identifier.");
  const parsed = vehicleCoverSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  await requireUser();
  const supabase = await createClient();

  if (parsed.data.photo_id) {
    const { data: photo } = await supabase
      .from("photos")
      .select("id, sighting_id")
      .eq("id", parsed.data.photo_id)
      .maybeSingle();
    if (!photo) return notFoundFailure("Photograph not found.");

    const { data: sighting } = await supabase
      .from("sightings")
      .select("vehicle_id")
      .eq("id", photo.sighting_id)
      .maybeSingle();
    if (!sighting || sighting.vehicle_id !== id.data) {
      return notFoundFailure("That photograph is not part of this vehicle's archive.");
    }
  }

  const { error } = await supabase
    .from("vehicles")
    .update({ cover_photo_id: parsed.data.photo_id })
    .eq("id", id.data);

  if (error) return dbFailure("set vehicle cover", error);

  revalidateVehicleSurfaces(id.data);
  return { ok: true, data: { photoId: parsed.data.photo_id } };
}

export async function deleteVehicle(
  vehicleId: string,
): Promise<
  ActionResult<{ deletedSightings: number; deletedPhotos: number }>
> {
  const id = idSchema.safeParse(vehicleId);
  if (!id.success) return notFoundFailure("Invalid vehicle identifier.");

  await requireUser();
  const supabase = await createClient();

  const { data: sightings } = await supabase
    .from("sightings")
    .select("id")
    .eq("vehicle_id", id.data);
  const sightingIds = (sightings ?? []).map((row) => row.id);

  let photoCount = 0;
  if (sightingIds.length > 0) {
    const { count } = await supabase
      .from("photos")
      .select("*", { count: "exact", head: true })
      .in("sighting_id", sightingIds);
    photoCount = count ?? 0;
  }

  const paths = await getPhotoPathsForSightings(sightingIds);
  const failures = await removeStorageObjects(paths);
  if (failures.length > 0) {
    return {
      ok: false,
      error: `Could not remove ${failures.length} photograph file(s) from storage, so nothing was deleted. Check your connection and try again.`,
    };
  }

  const { error } = await supabase
    .from("vehicles")
    .delete()
    .eq("id", id.data)
    .select("id")
    .maybeSingle();

  if (error) return dbFailure("delete vehicle", error);

  revalidateVehicleSurfaces();
  return {
    ok: true,
    data: {
      deletedSightings: sightingIds.length,
      deletedPhotos: photoCount,
    },
  };
}
