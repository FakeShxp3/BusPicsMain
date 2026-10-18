import Link from "next/link";
import { TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ConfigError({
  title = "Supabase is not configured",
  message = "TransitSpotter needs a Supabase project for authentication, database and photo storage. Add your project URL and publishable key, then restart the development server.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 grid size-10 place-items-center rounded-md border border-warning/30 bg-warning/10 text-warning">
          <TriangleAlertIcon className="size-5" />
        </div>
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{message}</p>

        <div className="mt-5 rounded-md border border-border bg-muted/50 p-3">
          <p className="mb-2 font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
            .env.local
          </p>
          <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-foreground">
{`NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-or-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000`}
          </pre>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          See <span className="font-mono text-foreground">README.md</span> for the
          full setup, including database migrations and storage policies.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/login">Try sign-in anyway</Link>
          </Button>
          <Button asChild size="sm">
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer noopener"
            >
              Open Supabase dashboard
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
