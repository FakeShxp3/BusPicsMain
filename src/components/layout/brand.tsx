import Link from "next/link";
import { cn } from "@/lib/utils";

export function Brand({
  className,
  onNavigate,
  compact = false,
  inverted = false,
}: {
  className?: string;
  onNavigate?: () => void;
  compact?: boolean;
  inverted?: boolean;
}) {
  return (
    <Link
      href="/dashboard"
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-2.5 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className,
      )}
      aria-label="TransitSpotter - dashboard"
    >
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-md shadow-sm transition-transform group-hover:-translate-y-px",
          inverted ? "bg-white text-[#0b1526]" : "bg-primary text-primary-foreground",
        )}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M6.4 4.5h11.2A1.9 1.9 0 0 1 19.5 6.4v8.2a1.9 1.9 0 0 1-1.9 1.9H6.4a1.9 1.9 0 0 1-1.9-1.9V6.4A1.9 1.9 0 0 1 6.4 4.5Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M4.5 10.2h15" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 19.5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="13.6" r="1" fill="currentColor" />
          <circle cx="16" cy="13.6" r="1" fill="currentColor" />
        </svg>
      </span>
      {!compact ? (
        <span className="leading-none">
          <span
            className={cn(
              "block text-[15px] font-semibold tracking-tight",
              inverted ? "text-white" : "text-foreground",
            )}
          >
            TransitSpotter
          </span>
          <span
            className={cn(
              "mt-1 block font-mono text-[9px] tracking-[0.18em] uppercase",
              inverted ? "text-white/50" : "text-muted-foreground",
            )}
          >
            Spotter log
          </span>
        </span>
      ) : null}
    </Link>
  );
}
