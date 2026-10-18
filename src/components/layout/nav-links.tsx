"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/components/layout/nav-items";

export function NavLinks({
  items,
  onNavigate,
  compact = false,
}: {
  items: NavItem[];
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const pathname = usePathname();

  return (
    <ul className={cn("space-y-0.5", compact && "space-y-px")}>
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-sidebar-foreground/75 hover:bg-muted/70 hover:text-foreground",
              )}
            >
              {active ? (
                <span
                  aria-hidden="true"
                  className="absolute top-1/2 left-0 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary"
                />
              ) : null}
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  active ? "text-primary" : "text-muted-foreground",
                )}
                strokeWidth={active ? 2 : 1.7}
              />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
