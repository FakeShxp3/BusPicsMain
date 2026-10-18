"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlusIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { MAX_UPLOAD_MB } from "@/lib/env";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/format";
import { validateImageFile } from "@/lib/upload-client";

export type PendingPhoto = {
  id: string;
  file: File;
  previewUrl: string;
};

/**
 * Holds photographs selected before the sighting exists. Blob previews are
 * revoked when a photo is removed or the form unmounts.
 */
export function usePendingPhotos(maxPhotos: number) {
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const photosRef = useRef<PendingPhoto[]>([]);

  const commit = useCallback((next: PendingPhoto[]) => {
    photosRef.current = next;
    setPhotos(next);
  }, []);

  useEffect(() => {
    return () => {
      for (const photo of photosRef.current) {
        URL.revokeObjectURL(photo.previewUrl);
      }
    };
  }, []);

  const addFiles = useCallback(
    (files: File[]): string[] => {
      const errors: string[] = [];
      const next = [...photosRef.current];
      for (const file of files) {
        if (next.length >= maxPhotos) {
          errors.push(`A sighting can hold up to ${maxPhotos} photographs.`);
          break;
        }
        const problem = validateImageFile(file);
        if (problem) {
          errors.push(problem);
          continue;
        }
        next.push({
          id: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
        });
      }
      if (next.length !== photosRef.current.length) commit(next);
      return errors;
    },
    [commit, maxPhotos],
  );

  const removePhoto = useCallback(
    (id: string) => {
      const target = photosRef.current.find((photo) => photo.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      commit(photosRef.current.filter((photo) => photo.id !== id));
    },
    [commit],
  );

  const clear = useCallback(() => {
    for (const photo of photosRef.current) URL.revokeObjectURL(photo.previewUrl);
    commit([]);
  }, [commit]);

  return { photos, addFiles, removePhoto, clear };
}

export function PhotoDropzone({
  photos,
  addFiles,
  removePhoto,
  disabled = false,
  maxPhotos,
}: {
  photos: PendingPhoto[];
  addFiles: (files: File[]) => string[];
  removePhoto: (id: string) => void;
  disabled?: boolean;
  maxPhotos: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function accept(files: FileList | File[] | null) {
    if (!files) return;
    const list = Array.from(files);
    if (list.length === 0) return;
    const errors = addFiles(list);
    for (const message of errors) toast.error(message);
  }

  return (
    <div
      className={cn(
        "rounded-md border border-dashed p-3 transition-colors",
        dragging ? "border-primary bg-primary/5" : "border-border bg-muted/20",
        disabled && "pointer-events-none opacity-60",
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        accept(event.dataTransfer.files);
      }}
      onPaste={(event) => {
        if (event.clipboardData.files.length > 0) {
          event.preventDefault();
          accept(event.clipboardData.files);
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={(event) => {
          accept(event.target.files);
          event.target.value = "";
        }}
        aria-label="Choose photographs"
      />

      {photos.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded px-4 py-8 text-center focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <span className="grid size-10 place-items-center rounded-md border border-border bg-card text-muted-foreground">
            <ImagePlusIcon className="size-4" />
          </span>
          <span className="text-[13px] font-medium text-foreground">
            Add photographs
          </span>
          <span className="text-[11.5px] text-muted-foreground">
            Drag files here, paste, or browse · JPEG, PNG, WebP · up to {MAX_UPLOAD_MB} MB each
          </span>
        </button>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="group relative aspect-square overflow-hidden rounded border border-border bg-muted"
              >
                <img
                  src={photo.previewUrl}
                  alt={photo.file.name}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(photo.id)}
                  className="absolute top-1 right-1 grid size-6 place-items-center rounded bg-black/60 text-white opacity-90 transition-opacity hover:bg-black/80 group-hover:opacity-100"
                  aria-label={`Remove ${photo.file.name}`}
                >
                  <XIcon className="size-3.5" />
                </button>
                <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1.5 py-0.5 text-[9px] text-white/90">
                  {formatFileSize(photo.file.size)}
                </span>
              </div>
            ))}

            {photos.length < maxPhotos ? (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded border border-dashed border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                <ImagePlusIcon className="size-4" />
                <span className="text-[10px]">Add more</span>
              </button>
            ) : null}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {photos.length} of {maxPhotos} selected · captions can be added once the
            sighting is saved.
          </p>
        </div>
      )}
    </div>
  );
}
