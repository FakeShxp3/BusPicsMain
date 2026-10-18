"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckIcon,
  LoaderCircleIcon,
  RotateCcwIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { registerPhoto } from "@/lib/actions/photos";
import { MAX_UPLOAD_MB } from "@/lib/env";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/format";
import {
  isAllowedImageType,
  readImageDimensions,
  uploadImageToStorage,
  validateImageFile,
} from "@/lib/upload-client";
import { Button } from "@/components/ui/button";

type UploadStatus = "queued" | "uploading" | "saving" | "done" | "error";

type QueueItem = {
  id: string;
  file: File;
  previewUrl: string;
  status: UploadStatus;
  progress: number;
  error: string | null;
};

export function PhotoUploader({
  sightingId,
  userId,
  remainingSlots,
  maxBatch = 12,
}: {
  sightingId: string;
  userId: string;
  remainingSlots: number;
  maxBatch?: number;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<QueueItem[]>([]);
  const controllers = useRef(new Map<string, AbortController>());
  const processing = useRef(false);
  const mounted = useRef(true);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    mounted.current = true;
    const controllerMap = controllers.current;
    return () => {
      mounted.current = false;
      for (const controller of controllerMap.values()) controller.abort();
      for (const item of itemsRef.current) URL.revokeObjectURL(item.previewUrl);
    };
  }, []);

  function commit(updater: (current: QueueItem[]) => QueueItem[]) {
    const next = updater(itemsRef.current);
    itemsRef.current = next;
    if (mounted.current) setItems(next);
  }

  function updateItem(id: string, patch: Partial<QueueItem>) {
    commit((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  async function processQueue() {
    if (processing.current) return;
    processing.current = true;
    let uploaded = 0;

    try {
      for (;;) {
        const next = itemsRef.current.find((item) => item.status === "queued");
        if (!next) break;

        updateItem(next.id, { status: "uploading", progress: 0, error: null });
        try {
          const dimensions = await readImageDimensions(next.file);
          const controller = new AbortController();
          controllers.current.set(next.id, controller);

          const { storagePath } = await uploadImageToStorage({
            file: next.file,
            sightingId,
            userId,
            signal: controller.signal,
            onProgress: (fraction) => {
              updateItem(next.id, { progress: Math.max(0.04, fraction) });
            },
          });

          updateItem(next.id, { status: "saving", progress: 1 });

          const result = await registerPhoto({
            sighting_id: sightingId,
            storage_path: storagePath,
            original_filename: next.file.name,
            mime_type: next.file.type,
            file_size: next.file.size,
            width: dimensions.width,
            height: dimensions.height,
          });

          if (!result.ok) {
            throw new Error(result.error);
          }

          updateItem(next.id, { status: "done", progress: 1 });
          uploaded += 1;
        } catch (caught) {
          const message =
            caught instanceof Error
              ? caught.message
              : "The photograph could not be uploaded.";
          updateItem(next.id, { status: "error", error: message });
        } finally {
          controllers.current.delete(next.id);
        }
      }
    } finally {
      processing.current = false;
    }

    if (uploaded > 0) {
      toast.success(
        `${uploaded} photograph${uploaded === 1 ? "" : "s"} added to this sighting.`,
      );
      router.refresh();
    }
  }

  function enqueue(files: FileList | File[] | null) {
    if (!files) return;
    const list = Array.from(files);
    if (list.length === 0) return;

    const existing = itemsRef.current.filter((item) => item.status !== "error").length;
    const slots = Math.max(0, Math.min(remainingSlots - existing, maxBatch));
    if (slots === 0) {
      toast.error(
        remainingSlots <= 0
          ? "This sighting has reached the photograph limit."
          : `You can add ${maxBatch} photographs at a time.`,
      );
      return;
    }

    const additions: QueueItem[] = [];
    for (const file of list.slice(0, slots)) {
      const problem = validateImageFile(file);
      if (problem) {
        toast.error(problem);
        continue;
      }
      if (!isAllowedImageType(file.type)) {
        toast.error(`“${file.name}” has an unsupported file type.`);
        continue;
      }
      additions.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: "queued",
        progress: 0,
        error: null,
      });
    }

    if (list.length > slots) {
      toast.error(`Only ${slots} more photograph(s) can be added to this sighting.`);
    }

    if (additions.length === 0) return;
    commit((current) => [...current, ...additions]);
    void processQueue();
  }

  function retry(id: string) {
    updateItem(id, { status: "queued", error: null, progress: 0 });
    void processQueue();
  }

  function remove(id: string) {
    controllers.current.get(id)?.abort();
    const target = itemsRef.current.find((item) => item.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    commit((current) => current.filter((item) => item.id !== id));
  }

  const finished = items.filter((item) => item.status === "done");

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={(event) => {
          enqueue(event.target.files);
          event.target.value = "";
        }}
        aria-label="Choose photographs to upload"
      />

      <div
        className={cn(
          "rounded-md border border-dashed p-3 transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-border bg-muted/20",
          remainingSlots <= 0 && "opacity-60",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          enqueue(event.dataTransfer.files);
        }}
        onPaste={(event) => {
          if (event.clipboardData.files.length > 0) {
            event.preventDefault();
            enqueue(event.clipboardData.files);
          }
        }}
      >
        <div className="flex flex-col items-center gap-2 px-3 py-5 text-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={remainingSlots <= 0}
          >
            <UploadIcon />
            Choose photographs
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Drag or paste files · JPEG, PNG, WebP · up to {MAX_UPLOAD_MB} MB ·{" "}
            {remainingSlots} slot{remainingSlots === 1 ? "" : "s"} left
          </p>
        </div>
      </div>

      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-2.5 rounded-md border border-border bg-card p-2"
            >
              <img
                src={item.previewUrl}
                alt=""
                className="size-11 shrink-0 rounded object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-[12px] font-medium text-foreground">
                    {item.file.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={`Remove ${item.file.name} from the upload queue`}
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </div>
                <p className="mt-0.5 text-[10.5px] text-muted-foreground">
                  {formatFileSize(item.file.size)}
                  {item.status === "uploading"
                    ? ` · uploading ${Math.round(item.progress * 100)}%`
                    : item.status === "saving"
                      ? " · saving record"
                      : item.status === "done"
                        ? " · uploaded"
                        : item.status === "error"
                          ? " · failed"
                          : " · queued"}
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
                      onClick={() => retry(item.id)}
                      className="inline-flex items-center gap-1 text-[10.5px] font-medium text-primary hover:underline"
                    >
                      <RotateCcwIcon className="size-3" />
                      Retry
                    </button>
                  </div>
                ) : null}
              </div>

              <span className="mt-0.5 shrink-0">
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

      {finished.length > 0 ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            {finished.length} uploaded. The archive grid refreshes automatically.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              for (const item of finished) URL.revokeObjectURL(item.previewUrl);
              commit((current) => current.filter((item) => item.status !== "done"));
            }}
          >
            Clear finished
          </Button>
        </div>
      ) : null}
    </div>
  );
}
