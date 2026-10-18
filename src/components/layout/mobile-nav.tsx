"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOutIcon, PlusIcon } from "lucide-react";
import { Brand } from "@/components/layout/brand";
import { NavLinks } from "@/components/layout/nav-links";
import { PRIMARY_NAV, SECONDARY_NAV } from "@/components/layout/nav-items";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { signOut } from "@/lib/actions/auth";
import type { ShellUser } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

export function MobileNav({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: ShellUser;
}) {
  const pathname = usePathname();

  useEffect(() => {
    onOpenChange(false);
    // Only react to route changes, not to the setter identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[86vw] max-w-[300px] p-0" aria-describedby={undefined}>
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-4">
          <Brand onNavigate={() => onOpenChange(false)} />
        </div>

        <nav
          className="scrollbar-thin flex-1 overflow-y-auto px-2.5 py-3"
          aria-label="Mobile navigation"
        >
          <p className="eyebrow px-2 pb-2">Workspace</p>
          <NavLinks items={PRIMARY_NAV} onNavigate={() => onOpenChange(false)} />
          <Button asChild className="mt-4 w-full justify-start">
            <Link href="/sightings/new" onClick={() => onOpenChange(false)}>
              <PlusIcon />
              Add sighting
            </Link>
          </Button>
          <div className="my-4 border-t border-sidebar-border/80" />
          <p className="eyebrow px-2 pb-2">Library</p>
          <NavLinks items={SECONDARY_NAV} onNavigate={() => onOpenChange(false)} />
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-muted font-mono text-[11px] font-semibold">
                {user.initials}
              </span>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-[13px] font-medium">{user.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
          <form
            action={async () => {
              await signOut();
            }}
            className="mt-2"
          >
            <Button type="submit" variant="outline" size="sm" className="w-full justify-start">
              <LogOutIcon />
              Sign out
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
