import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import type { ShellUser } from "@/lib/types";

export function AppShell({
  user,
  timeZone,
  children,
}: {
  user: ShellUser;
  timeZone: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh lg:flex">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:border focus:border-border focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-foreground focus:shadow-lg"
      >
        Skip to content
      </a>
      <Sidebar user={user} />
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <TopBar user={user} timeZone={timeZone} />
        <main
          id="main-content"
          className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        >
          {children}
        </main>
        <footer className="mx-auto w-full max-w-[1440px] px-4 pb-6 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-4 text-[11px] text-muted-foreground">
            <span>TransitSpotter · private field notebook</span>
            <span>Records and photographs are visible only to your account.</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
