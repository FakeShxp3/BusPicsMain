"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, requireUser } from "@/lib/supabase/server";
import { MAX_UPLOAD_BYTES, PHOTO_BUCKET } from "@/lib/env";
import {
  photoMetadataSchema,
  photoRegistrationSchema,
  photoReorderSchema,
} from "@/lib/validation/schemas";
import type { ActionResult } from "@/lib/types";
import {
  dbFailure,
  invalidInput,
  isUniqueViolation,
  notFoundFailure,
} from "@/lib/actions/shared";
import {
  isOwnedStoragePath,
  removeStorageObjects,
} from "@/lib/storage-server";

const idSchema = z.string().uuid("Invalid photograph identifier");

function revalidatePhotoSurfaces(extra?: string[]) {
  revalidatePath("/gallery");
  revalidatePath("/sightings");
  revalidatePath("/fleet");
  revalidatePath("/dashboard");
  revalidatePath("/stats");
  revalidatePath("/map");
  for (const path of extra ?? []) revalidatePath(path);
}

async function removeOrphan(supabase: Awaited<ReturnType<typeof createClient>>, path: string) {
  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove([path]);
  if (error) console.error("[transitspotter] could not remove orphan upload:", error);
}

export async function registerPhoto(
  input: unknown,
): Promise<ActionResult<{ id: string; isCover: boolean; sortOrder: number }>> {
  const parsed = photoRegistrationSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const user = await requireUser();
  const supabase = await createClient();
  const { sighting_id, storage_path, mime_type, file_size, width, height, original_filename } =
    parsed.data;

  if (!isOwnedStoragePath(storage_path, user.id, sighting_id)) {
    return notFoundFailure("That upload does not match this sighting.");
  }
  if (file_size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: `Photographs must be smaller than ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`,
    };
  }

  const { data: sighting } = await supabase
    .from("sightings")
    .select("id, vehicle_id")
    .eq("id", sighting_id)
    .maybeSingle();
  if (!sighting) {
    await removeOrphan(supabase, storage_path);
    return notFoundFailure("Sighting not found.");
  }

  const { data: info, error: infoError } = await supabase.storage
    .from(PHOTO_BUCKET)
    .info(storage_path);

  if (infoError || !info) {
    return {
      ok: false,
      error:
        "The uploaded file could not be verified in storage. Try uploading it again.",
    };
  }

  if (info.size && info.size > MAX_UPLOAD_BYTES) {
    await removeOrphan(supabase, storage_path);
    return {
      ok: false,
      error: `The uploaded file is larger than the ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB limit and was removed.`,
    };
  }

  const actualMime = (info.contentType ?? mime_type).split(";")[0]?.trim();
  if (actualMime && actualMime !== mime_type) {
    await removeOrphan(supabase, storage_path);
    return {
      ok: false,
      error: "The stored file type does not match the upload. Try again with a JPEG, PNG or WebP image.",
    };
  }

  const { count } = await supabase
    .from("photos")
    .select("*", { count: "exact", head: true })
    .eq("sighting_id", sighting_id);

  const { data: last } = await supabase
    .from("photos")
    .select("sort_order")
    .eq("sighting_id", sighting_id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = (last?.sort_order ?? -1) + 1;
  const isCover = (count ?? 0) === 0;

  const { data, error } = await supabase
    .from("photos")
    .insert({
      user_id: user.id,
      sighting_id,
      storage_path,
      original_filename,
      mime_type,
      file_size: info.size ?? file_size,
      width: width ?? null,
      height: height ?? null,
      sort_order: sortOrder,
      is_cover: isCover,
    })
    .select("id")
    .single();

  if (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "This photograph is already in the archive." };
    }
    await removeOrphan(supabase, storage_path);
    return dbFailure("register photo", error);
  }

  revalidatePhotoSurfaces([
    `/sightings/${sighting_id}`,
    `/fleet/${sighting.vehicle_id}`,
  ]);
  return { ok: true, data: { id: data.id, isCover, sortOrder } };
}

export async function updatePhotoMetadata(
  photoId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const id = idSchema.safeParse(photoId);
  if (!id.success) return notFoundFailure("Invalid photograph identifier.");
  const parsed = photoMetadataSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("photos")
    .update(parsed.data)
    .eq("id", id.data)
    .select("id, sighting_id")
    .maybeSingle();

  if (error) return dbFailure("update photo metadata", error);
  if (!data) return notFoundFailure("Photograph not found.");

  revalidatePhotoSurfaces([`/sightings/${data.sighting_id}`]);
  return { ok: true, data: { id: data.id } };
}

export async function setPhotoCover(
  photoId: string,
): Promise<ActionResult<{ id: string }>> {
  const id = idSchema.safeParse(photoId);
  if (!id.success) return notFoundFailure("Invalid photograph identifier.");

  await requireUser();
  const supabase = await createClient();
  const { data: photo } = await supabase
    .from("photos")
    .select("id, sighting_id")
    .eq("id", id.data)
    .maybeSingle();
  if (!photo) return notFoundFailure("Photograph not found.");

  const { error: clearError } = await supabase
    .from("photos")
    .update({ is_cover: false })
    .eq("sighting_id", photo.sighting_id)
    .eq("is_cover", true);
  if (clearError) return dbFailure("clear photo cover", clearError);

  const { error } = await supabase
    .from("photos")
    .update({ is_cover: true })
    .eq("id", photo.id);
  if (error) return dbFailure("set photo cover", error);

  revalidatePhotoSurfaces([`/sightings/${photo.sighting_id}`]);
  return { ok: true, data: { id: photo.id } };
}

export async function reorderPhotos(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = photoReorderSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  await requireUser();
  const supabase = await createClient();
  const { sighting_id, photo_ids } = parsed.data;

  const { data: rows } = await supabase
    .from("photos")
    .select("id")
    .eq("sighting_id", sighting_id)
    .in("id", photo_ids);
  const existing = new Set((rows ?? []).map((row) => row.id));
  if (existing.size !== photo_ids.length) {
    return notFoundFailure("One or more photographs are not part of this sighting.");
  }

  const results = await Promise.all(
    photo_ids.map((photoId, index) =>
      supabase.from("photos").update({ sort_order: index }).eq("id", photoId),
    ),
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) return dbFailure("reorder photos", failed.error);

  revalidatePhotoSurfaces([`/sightings/${sighting_id}`]);
  return { ok: true, data: { id: sighting_id } };
}

export async function deletePhoto(
  photoId: string,
): Promise<ActionResult<{ warning: string | null }>> {
  const id = idSchema.safeParse(photoId);
  if (!id.success) return notFoundFailure("Invalid photograph identifier.");

  await requireUser();
  const supabase = await createClient();
  const { data: photo } = await supabase
    .from("photos")
    .select("id, sighting_id, storage_path")
    .eq("id", id.data)
    .maybeSingle();
  if (!photo) return notFoundFailure("Photograph not found.");

  const { error } = await supabase.from("photos").delete().eq("id", photo.id);
  if (error) return dbFailure("delete photo", error);

  const failures = await removeStorageObjects([photo.storage_path]);

  revalidatePhotoSurfaces([`/sightings/${photo.sighting_id}`]);
  return {
    ok: true,
    data: {
      warning:
        failures.length > 0
          ? "The record was deleted, but the image file could not be removed from storage. Try again later."
          : null,
    },
  };
}
