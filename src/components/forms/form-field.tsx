import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={htmlFor} className="text-[12.5px]">
          {label}
          {required ? (
            <span className="text-destructive" aria-hidden="true">
              *
            </span>
          ) : null}
        </Label>
        {hint ? (
          <span className="shrink-0 text-right text-[10.5px] leading-tight text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </div>
      {children}
      {error ? (
        <p className="text-[11.5px] leading-snug text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function FormSection({
  title,
  description,
  children,
  className,
  contentClassName,
  action,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  action?: React.ReactNode;
}) {
  return (
    <section className={cn("overflow-hidden rounded-lg border border-border bg-card", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/70 px-5 py-3.5">
        <div className="space-y-0.5">
          <h2 className="text-[13.5px] font-semibold tracking-tight text-foreground">{title}</h2>
          {description ? (
            <p className="text-[12px] leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className={cn("grid grid-cols-1 gap-x-4 gap-y-4 p-5 sm:grid-cols-2", contentClassName)}>
        {children}
      </div>
    </section>
  );
}

export function FormAlert({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-[12.5px] leading-relaxed text-destructive"
    >
      {children}
    </div>
  );
}
