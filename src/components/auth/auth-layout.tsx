import Link from "next/link";
import { Brand } from "@/components/layout/brand";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 min-h-dvh lg:grid-cols-[1.02fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#0a1424] p-10 text-white lg:flex">
        <div className="relative z-10">
          <Brand inverted />
        </div>

        <svg
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -bottom-20 h-[560px] w-[560px] text-white/[0.055]"
          viewBox="0 0 400 400"
          fill="none"
        >
          <circle cx="200" cy="200" r="150" stroke="currentColor" strokeWidth="1" />
          <circle cx="200" cy="200" r="110" stroke="currentColor" strokeWidth="1" />
          <path d="M40 250h120l40-90h120l40 40" stroke="currentColor" strokeWidth="1.4" />
          <path d="M20 120h100l60 160h180" stroke="currentColor" strokeWidth="1.4" />
          <path d="M0 320h140l50-140h210" stroke="currentColor" strokeWidth="1" strokeDasharray="4 6" />
          <circle cx="160" cy="250" r="4" fill="currentColor" />
          <circle cx="120" cy="120" r="4" fill="currentColor" />
          <circle cx="280" cy="160" r="4" fill="currentColor" />
        </svg>

        <div className="relative z-10 max-w-md">
          <p className="font-mono text-[10px] tracking-[0.22em] text-white/45 uppercase">
            Private field notebook
          </p>
          <h1 className="mt-5 font-editorial text-[42px] leading-[1.06] font-normal tracking-tight text-white">
            Every bus you photograph,
            <br />
            <span className="text-[#e9b45c] italic">remembered properly.</span>
          </h1>
          <p className="mt-5 max-w-sm text-[13.5px] leading-relaxed text-white/60">
            Fleet records, sighting details, routes, camera settings and the
            photographs themselves — kept together in one archive that belongs
            to you.
          </p>
        </div>

        <div className="relative z-10">
          <div className="mb-4 h-px w-full bg-white/10" />
          <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-[10px] tracking-[0.14em] text-white/35 uppercase">
            <span>Fleet database</span>
            <span>Sighting log</span>
            <span>Photo archive</span>
            <span>Spotting map</span>
          </div>
        </div>
      </aside>

      <main className="flex min-h-dvh flex-col px-5 py-7 sm:px-10">
        <div className="lg:hidden">
          <Brand />
        </div>
        <div className="mx-auto flex w-full max-w-[380px] flex-1 flex-col justify-center py-10">
          {children}
        </div>
        <p className="text-center text-[11px] text-muted-foreground">
          Private by default · No public profile ·{" "}
          <Link href="/settings" className="underline-offset-4 hover:underline">
            About this app
          </Link>
        </p>
      </main>
    </div>
  );
}
