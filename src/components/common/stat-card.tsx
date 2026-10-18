import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  href?: string;
  className?: string;
};

export function StatCard({ label, value, hint, icon: Icon, href, className }: StatCardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
          {label}
        </p>
        {Icon ? <Icon className="size-4 shrink-0 text-muted-foreground/70" strokeWidth={1.7} /> : null}
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="numeric text-[26px] leading-none font-semibold text-foreground">{value}</p>
        {href ? (
          <ArrowUpRightIcon className="size-3.5 text-muted-foreground/0 transition-all group-hover:text-muted-foreground" />
        ) : null}
      </div>
      {hint ? <p className="mt-2 text-[11.5px] leading-snug text-muted-foreground">{hint}</p> : null}
    </>
  );

  const classes = cn(
    "group relative flex flex-col rounded-lg border border-border bg-card p-4 transition-colors",
    href && "hover:border-primary/40 focus-visible:border-primary focus-visible:outline-none",
    className,
  );

  if (!href) return <div className={classes}>{content}</div>;

  return (
    <Link href={href} className={classes} aria-label={`${label}: view records`}>
      {content}
    </Link>
  );
}
