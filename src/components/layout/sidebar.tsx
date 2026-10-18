"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { Brand } from "@/components/layout/brand";
import { NavLinks } from "@/components/layout/nav-links";
import { PRIMARY_NAV, SECONDARY_NAV } from "@/components/layout/nav-items";
import { UserMenu } from "@/components/layout/user-menu";
import type { ShellUser } from "@/lib/types";
import { Button } from "@/components/ui/button";

export function Sidebar({ user }: { user: ShellUser }) {
  const pathname = usePathname();
  const isNewSighting = pathname === "/sightings/new";

  return (
    <aside className="sticky top-0 hidden h-dvh w-[236px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="px-4 pt-5 pb-4">
        <Brand />
      </div>

      <nav className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-2.5 pb-4" aria-label="Main navigation">
        <p className="eyebrow px-2 pt-1 pb-2">Workspace</p>
        <NavLinks items={PRIMARY_NAV} />

        <Button
          asChild
          variant={isNewSighting ? "secondary" : "default"}
          size="sm"
          className="mt-4 w-full justify-start"
        >
          <Link href="/sightings/new">
            <PlusIcon />
            Record a sighting
          </Link>
        </Button>

        <div className="my-4 border-t border-sidebar-border/80" />
        <p className="eyebrow px-2 pb-2">Library</p>
        <NavLinks items={SECONDARY_NAV} />
      </nav>

      <div className="border-t border-sidebar-border p-2.5">
        <UserMenu user={user} side="top" align="start" />
      </div>
    </aside>
  );
}
