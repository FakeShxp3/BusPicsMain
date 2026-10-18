"use client";

import { useState } from "react";
import Link from "next/link";
import { MenuIcon, PlusIcon } from "lucide-react";
import { Brand } from "@/components/layout/brand";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { GlobalSearch } from "@/components/search/global-search";
import { Button } from "@/components/ui/button";
import type { ShellUser } from "@/lib/types";

export function TopBar({
  user,
  timeZone,
}: {
  user: ShellUser;
  timeZone: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-1.5 border-b border-border bg-background px-3 sm:gap-2 sm:px-5">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="-ml-1.5 lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
      >
        <MenuIcon className="size-5" />
      </Button>

      <div className="lg:hidden">
        <Brand compact />
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <GlobalSearch timeZone={timeZone} />
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
        <Button asChild size="sm" className="h-8 px-2.5 sm:px-3">
          <Link href="/sightings/new" aria-label="Add sighting">
            <PlusIcon />
            <span className="hidden sm:inline">Add sighting</span>
          </Link>
        </Button>
        <ThemeToggle className="hidden sm:inline-flex" />
        <div className="hidden md:block lg:hidden">
          <UserMenu user={user} compact side="bottom" align="end" />
        </div>
      </div>

      <MobileNav open={mobileOpen} onOpenChange={setMobileOpen} user={user} />
    </header>
  );
}
