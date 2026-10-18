"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  CheckIcon,
  CircleCheckIcon,
  LoaderCircleIcon,
  RotateCcwIcon,
} from "lucide-react";
import { toast } from "sonner";
import { registerPhoto } from "@/lib/actions/photos";
import type { PendingPhoto } from "@/components/photos/photo-dropzone";
import { formatFileSize } from "@/lib/format";
import { readImageDimensions, uploadImageToStorage } from "@/lib/upload-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  file: File;
  previewUrl: string;
  status: "queued" | "uploading" | "saving" | "done" | "error";
  progress: number;
  error: string | null;
};

export function SightingSaveProgress({
  sightingId,
  userId,
  vehicleId,
  label,
  photos,
}: {
  sightingId: string;
  userId: string;
  vehicleId: string;
  label: string;
  photos: PendingPhoto[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>(() =>
    photos.map((photo) => ({
      id: photo.id,
      file: photo.file,
      previewUrl: photo.previewUrl,
      status: "queued",
      progress: 0,
      error: null,
    })),
  );
  const itemsRef = useRef(items);
  const processing = useRef(false);
  const started = useRef(false);
  const [attempted, setAttempted] = useState(false);

  function commit(updater: (current: Item[]) => Item[]) {
    const next = updater(itemsRef.current);
    itemsRef.current = next;
    setItems(next);
  }

  function update(id: string, patch: Partial<Item>) {
    commit((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function uploadPending() {
    if (processing.current) return;
    processing.current = true;
    let uploaded = 0;

    try {
      for (;;) {
        const next = itemsRef.current.find((item) => item.status === "queued");
        if (!next) break;
        update(next.id, { status: "uploading", progress: 0, error: null });
        try {
          const dimensions = await readImageDimensions(next.file);
          const { storagePath } = await uploadImageToStorage({
            file: next.file,
            sightingId,
            userId,
            onProgress: (fraction) =>
              update(next.id, { progress: Math.max(0.04, fraction) }),
          });
          update(next.id, { status: "saving", progress: 1 });
          const result = await registerPhoto({
            sighting_id: sightingId,
            storage_path: storagePath,
            original_filename: next.file.name,
            mime_type: next.file.type,
            file_size: next.file.size,
            width: dimensions.width,
            height: dimensions.height,
          });
          if (!result.ok) throw new Error(result.error);
          update(next.id, { status: "done", progress: 1 });
          uploaded += 1;
        } catch (caught) {
          update(next.id, {
            status: "error",
            error: caught instanceof Error ? caught.message : "Upload failed.",
          });
        }
      }
    } finally {
      processing.current = false;
      setAttempted(true);
    }

    if (uploaded > 0) {
      toast.success(
        `${uploaded} photograph${uploaded === 1 ? "" : "s"} added to the sighting.`,
      );
      router.refresh();
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (itemsRef.current.length > 0) void uploadPending();
    else setAttempted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const done = items.filter((item) => item.status === "done").length;
  const failed = items.filter((item) => item.status === "error").length;
  const active = items.some(
    (item) => item.status === "uploading" || item.status === "saving",
  );

  function retry(item: Item) {
    update(item.id, { status: "queued", error: null, progress: 0 });
    void uploadPending();
  }

  return (
    <div className="mx-auto max-w-xl space-y-5 rounded-lg border border-border bg-card p-6">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-success/30 bg-success/10 text-success">
          <CircleCheckIcon className="size-5" />
        </div>
        <div>
          <p className="eyebrow">Saved</p>
          <h1 className="mt-1 text-lg font-semibold tracking-tight">Sighting recorded</h1>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
            {label} · {items.length > 0
              ? `${done} of ${items.length} photograph${items.length === 1 ? "" : "s"} attached.`
              : "No photographs attached — you can add them later from the sighting page."}
          </p>
        </div>
      </div>

      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-2.5 rounded-md border border-border bg-muted/20 p-2"
            >
              <img src={item.previewUrl} alt="" className="size-11 shrink-0 rounded object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium">{item.file.name}</p>
                <p className="mt-0.5 text-[10.5px] text-muted-foreground">
                  {formatFileSize(item.file.size)} ·{" "}
                  {item.status === "uploading"
                    ? `uploading ${Math.round(item.progress * 100)}%`
                    : item.status === "saving"
                      ? "saving record"
                      : item.status === "done"
                        ? "uploaded"
                        : item.status === "error"
                          ? "failed"
                          : "queued"}
                </p>
                {item.status === "uploading" || item.status === "saving" ? (
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-[width] duration-200"
                      style={{
                        width: `${Math.round((item.status === "saving" ? 1 : item.progress) * 100)}%`,
                      }}
                    />
                  </div>
                ) : null}
                {item.error ? (
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <p className="text-[10.5px] text-destructive">{item.error}</p>
                    <button
                      type="button"
                      onClick={() => retry(item)}
                      className="inline-flex items-center gap-1 text-[10.5px] font-medium text-primary hover:underline"
                    >
                      <RotateCcwIcon className="size-3" />
                      Retry
                    </button>
                  </div>
                ) : null}
              </div>
              <span className="mt-1 shrink-0">
                {item.status === "done" ? (
                  <CheckIcon className="size-4 text-success" />
                ) : item.status === "error" ? (
                  <span className="grid size-4 place-items-center rounded-full bg-destructive/15 text-[10px] font-semibold text-destructive">
                    !
                  </span>
                ) : (
                  <LoaderCircleIcon className="size-4 animate-spin text-muted-foreground" />
                )}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {failed > 0 && !active ? (
        <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-[11.5px] leading-relaxed text-foreground">
          {failed} photograph{failed === 1 ? "" : "s"} could not be uploaded. The
          sighting itself is saved — retry above, or add the photographs later from the
          sighting page.
        </p>
      ) : null}

      <div className="flex flex-col gap-2 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] text-muted-foreground">
          {active
            ? "Uploads run while this page stays open."
            : attempted
              ? "You can finish now or return to the sighting later."
              : "Preparing uploads…"}
        </p>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={`/fleet/${vehicleId}`}>Vehicle page</a>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              router.push(`/sightings/${sightingId}`);
              router.refresh();
            }}
            className={cn(active && "opacity-90")}
          >
            Open sighting
            <ArrowRightIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}
