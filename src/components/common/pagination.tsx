import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";

type PaginationProps = {
  basePath: string;
  params: Record<string, string | undefined>;
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  itemLabel?: string;
  className?: string;
};

function hrefFor(basePath: string, params: Record<string, string | undefined>, page: number) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  if (page > 1) search.set("page", String(page));
  else search.delete("page");
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

function pageWindow(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
  const pages = new Set<number>([1, pageCount, page, page - 1, page + 1]);
  const sorted = Array.from(pages)
    .filter((value) => value >= 1 && value <= pageCount)
    .sort((a, b) => a - b);
  const result: (number | "gap")[] = [];
  let previous = 0;
  for (const value of sorted) {
    if (previous && value - previous > 1) result.push("gap");
    result.push(value);
    previous = value;
  }
  return result;
}

export function Pagination({
  basePath,
  params,
  page,
  pageCount,
  total,
  pageSize,
  itemLabel = "records",
  className,
}: PaginationProps) {
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pages = pageWindow(page, Math.max(pageCount, 1));

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        "flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <p className="text-xs text-muted-foreground">
        <span className="tabular text-foreground">{formatNumber(from)}</span>
        {"–"}
        <span className="tabular text-foreground">{formatNumber(to)}</span> of{" "}
        <span className="tabular text-foreground">{formatNumber(total)}</span> {itemLabel}
      </p>
      <div className="flex items-center gap-1">
        <Link
          aria-label="Previous page"
          aria-disabled={page <= 1}
          tabIndex={page <= 1 ? -1 : undefined}
          href={hrefFor(basePath, params, Math.max(1, page - 1))}
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            page <= 1 && "pointer-events-none opacity-40",
          )}
        >
          <ChevronLeftIcon className="size-4" />
        </Link>
        {pages.map((entry, index) =>
          entry === "gap" ? (
            <span key={`gap-${index}`} className="grid size-8 place-items-center text-muted-foreground">
              <MoreHorizontalIcon className="size-4" />
            </span>
          ) : (
            <Link
              key={entry}
              href={hrefFor(basePath, params, entry)}
              aria-current={entry === page ? "page" : undefined}
              className={cn(
                "inline-flex size-8 items-center justify-center rounded-md border text-xs tabular transition-colors",
                entry === page
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {entry}
            </Link>
          ),
        )}
        <Link
          aria-label="Next page"
          aria-disabled={page >= pageCount}
          tabIndex={page >= pageCount ? -1 : undefined}
          href={hrefFor(basePath, params, Math.min(pageCount, page + 1))}
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            page >= pageCount && "pointer-events-none opacity-40",
          )}
        >
          <ChevronRightIcon className="size-4" />
        </Link>
      </div>
    </nav>
  );
}
