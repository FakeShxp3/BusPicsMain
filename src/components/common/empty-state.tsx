import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: LucideIcon;
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  className?: string;
  compact?: boolean;
};

export function EmptyState({
  icon: Icon,
  eyebrow,
  title,
  description,
  action,
  secondaryAction,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/60 text-center",
        compact ? "gap-3 px-6 py-10" : "gap-4 px-6 py-16",
        className,
      )}
    >
      {Icon ? (
        <div className="mb-1 grid size-11 place-items-center rounded-lg border border-border bg-muted/70 text-muted-foreground">
          <Icon className="size-5" strokeWidth={1.6} />
        </div>
      ) : null}
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <div className="space-y-1.5">
        <h2 className={cn("font-semibold tracking-tight text-foreground", compact ? "text-sm" : "text-base")}>
          {title}
        </h2>
        {description ? (
          <p className="mx-auto max-w-md text-[13px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action || secondaryAction ? (
        <div className="flex flex-col items-center gap-2 sm:flex-row">
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}
