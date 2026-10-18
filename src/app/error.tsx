"use client";

import { useEffect } from "react";
import { CircleAlertIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[transitspotter] route error:", error);
  }, [error]);

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md space-y-5">
        <div className="grid size-11 place-items-center rounded-lg border border-destructive/30 bg-destructive/10 text-destructive">
          <CircleAlertIcon className="size-5" />
        </div>
        <div className="space-y-2">
          <p className="eyebrow">Something went wrong</p>
          <h1 className="text-xl font-semibold tracking-tight">
            This page could not be loaded
          </h1>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            The archive could not be reached, or the database returned an error. Your
            saved records are untouched. Try again, or return to the dashboard.
          </p>
          {error.digest ? (
            <p className="font-mono text-[10px] text-muted-foreground">
              Reference: {error.digest}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => reset()}>
            <RotateCcwIcon />
            Try again
          </Button>
          <Button asChild variant="outline">
            <a href="/dashboard">Dashboard</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
