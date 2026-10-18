"use client";

import { createClient } from "@/lib/supabase/client";
import {
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_MB,
  PHOTO_BUCKET,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
} from "@/lib/env";
import { fileExtension } from "@/lib/utils";

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export function isAllowedImageType(type: string): type is AllowedImageType {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(type);
}

export function validateImageFile(file: File): string | null {
  const extension = fileExtension(file.name);
  if (file.type === "image/heic" || file.type === "image/heif" || ["heic", "heif"].includes(extension)) {
    return "HEIC/HEIF images are not supported. Export them as JPEG, PNG or WebP first.";
  }
  if (!isAllowedImageType(file.type)) {
    return `“${file.name}” is not a supported image. Use JPEG, PNG or WebP.`;
  }
  if (file.size <= 0) {
    return `“${file.name}” is empty.`;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `“${file.name}” is ${(file.size / (1024 * 1024)).toFixed(1)} MB; the limit is ${MAX_UPLOAD_MB} MB.`;
  }
  return null;
}

export async function readImageDimensions(
  file: File,
): Promise<{ width: number | null; height: number | null }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      const dimensions = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return dimensions;
    } catch {
      // fall through to the <img> method
    }
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: null, height: null });
    };
    image.src = url;
  });
}

export type UploadResult = {
  storagePath: string;
};

/**
 * Uploads straight to Supabase Storage with progress reporting. The private
 * bucket's RLS policy only allows writes into the signed-in user's folder.
 */
export async function uploadImageToStorage({
  file,
  sightingId,
  userId,
  onProgress,
  signal,
}: {
  file: File;
  sightingId: string;
  userId: string;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}): Promise<UploadResult> {
  const supabase = createClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    throw new Error("Your session has expired. Sign in again, then retry the upload.");
  }

  const extension = fileExtension(file.name) || "jpg";
  const filename = `${crypto.randomUUID()}.${extension}`;
  const storagePath = `${userId}/${sightingId}/${filename}`;
  const encodedPath = storagePath.split("/").map(encodeURIComponent).join("/");
  const url = `${SUPABASE_URL}/storage/v1/object/${PHOTO_BUCKET}/${encodedPath}`;

  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", url, true);
    request.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
    request.setRequestHeader("apikey", SUPABASE_ANON_KEY);
    request.setRequestHeader("Content-Type", file.type);
    request.setRequestHeader("Cache-Control", "3600");
    request.setRequestHeader("x-upsert", "false");

    request.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.min(1, event.loaded / event.total));
      }
    };

    request.onerror = () => reject(new Error("Network error while uploading the photograph."));
    request.onabort = () => reject(new Error("Upload cancelled."));
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve();
        return;
      }
      let message = `Upload failed (${request.status}).`;
      try {
        const parsed = JSON.parse(request.responseText) as { message?: string; error?: string };
        if (parsed.message) message = parsed.message;
        else if (parsed.error) message = parsed.error;
      } catch {
        // keep the generic message
      }
      reject(new Error(message));
    };

    signal?.addEventListener("abort", () => request.abort(), { once: true });
    request.send(file);
  });

  return { storagePath };
}

