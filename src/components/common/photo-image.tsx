"use client";

import { useState } from "react";
import { ImageOffIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Plain responsive image for private, short-lived signed URLs. Falls back to a
 * neutral placeholder instead of showing a broken-image glyph.
 */
export function PhotoImage({
  src,
  alt,
  className,
  imgClassName,
  loading = "lazy",
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  imgClassName?: string;
  loading?: "lazy" | "eager";
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground/50",
          className,
        )}
        role="img"
        aria-label={alt}
      >
        <ImageOffIcon className="size-5" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      decoding="async"
      onError={() => setFailed(true)}
      className={cn("h-full w-full object-cover", imgClassName, className)}
    />
  );
}
