"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ChevronsUpDownIcon,
  LogOutIcon,
  SettingsIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/actions/auth";
import type { ShellUser } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({
  user,
  align = "end",
  side = "top",
  compact = false,
}: {
  user: ShellUser;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom";
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md border border-transparent p-1.5 text-left transition-colors hover:border-border hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            compact && "w-auto",
          )}
          aria-label="Account menu"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-muted font-mono text-[11px] font-semibold text-foreground">
            {user.initials}
          </span>
          {!compact ? (
            <>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[13px] font-medium text-foreground">
                  {user.name}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {user.email ?? "Signed in"}
                </span>
              </span>
              <ChevronsUpDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
            </>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} side={side} className="w-60">
        <DropdownMenuLabel>Signed in</DropdownMenuLabel>
        <div className="px-2 pb-2">
          <p className="truncate text-[13px] font-medium text-foreground">{user.name}</p>
          <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <UserIcon />
            Account & preferences
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/operators">
            <UsersIcon />
            Manage operators
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings#exports">
            <SettingsIcon />
            Export my data
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={pending}
          onSelect={(event) => {
            event.preventDefault();
            setOpen(false);
            startTransition(async () => {
              await signOut();
              router.refresh();
            });
          }}
        >
          <LogOutIcon />
          {pending ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
