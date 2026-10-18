import type { Metadata } from "next";
import Link from "next/link";
import {
  DatabaseIcon,
  DownloadIcon,
  FileBracesIcon,
  FileSpreadsheetIcon,
  FolderArchiveIcon,
  ImagesIcon,
  LockIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { SettingsForm } from "@/components/settings/settings-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { APP_VERSION } from "@/lib/constants";
import { displayName, getViewer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Settings" };

const EXPORTS = [
  {
    title: "Vehicles CSV",
    href: "/api/export/vehicles.csv",
    icon: FileSpreadsheetIcon,
    description:
      "Every fleet record: operator, fleet number, manufacturer, model, generation, category, powertrain, length, years, status, verification date, sighting and photo counts, notes and timestamps.",
  },
  {
    title: "Sightings CSV",
    href: "/api/export/sightings.csv",
    icon: FileSpreadsheetIcon,
    description:
      "Every sighting with its vehicle and operator, date, route, direction, location, coordinates, camera settings, weather, notes and photo count.",
  },
  {
    title: "Structured JSON",
    href: "/api/export/data.json",
    icon: FileBracesIcon,
    description:
      "Operators, vehicles, sightings, photo records and status history as JSON. Image files are not embedded — this is a data export, not a complete backup of the photographs.",
  },
  {
    title: "Original photo archive",
    href: "/api/export/photos.zip",
    icon: FolderArchiveIcon,
    description:
      "A streamed ZIP of up to 400 original photographs with a manifest. Larger archives should be downloaded in smaller batches from the gallery or individual photos.",
  },
] as const;

export default async function SettingsPage() {
  const viewer = await getViewer();
  const name = displayName(viewer.profile, viewer.email);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account · preferences · data"
        title="Settings"
        description="Tune how the archive looks and behaves, and take your records with you whenever you want."
      />

      <SettingsForm
        displayName={viewer.profile?.display_name ?? name}
        email={viewer.email}
        preferences={viewer.preferences}
      />

      <section id="exports" className="scroll-mt-24 space-y-3">
        <div>
          <p className="eyebrow">Data management</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">Export your archive</h2>
          <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-muted-foreground">
            Exports are generated on demand from your own records and downloaded through
            your authenticated session. They contain no other user&apos;s data and create
            no public links.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {EXPORTS.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.href} className="flex flex-col">
                <CardHeader className="flex-row items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-md border border-border bg-muted/50 text-muted-foreground">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="text-[13.5px]">{item.title}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="mt-auto">
                  <Button asChild variant="outline" size="sm">
                    <a href={item.href} download>
                      <DownloadIcon />
                      Download
                    </a>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="rounded-lg border border-warning/25 bg-warning/5 px-4 py-3 text-[11.5px] leading-relaxed text-muted-foreground">
          <p className="flex items-start gap-2">
            <DatabaseIcon className="mt-0.5 size-3.5 shrink-0 text-warning" />
            <span>
              <span className="font-medium text-foreground">JSON is not a full backup.</span>{" "}
              It contains structured records only. To retain the photographs themselves,
              download the photo archive ZIP or the individual originals. Deleting a
              sighting or vehicle also removes its image files from storage, and that
              cannot be undone.
            </span>
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="eyebrow">About</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">Application information</h2>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LockIcon className="size-3.5 text-muted-foreground" />
                Privacy by default
              </CardTitle>
              <CardDescription>
                Every table has Row Level Security. The photo bucket is private and its
                policies only allow access to your own folder.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-[11.5px] leading-relaxed text-muted-foreground">
              <ul className="space-y-1.5">
                <li className="flex gap-2">
                  <ShieldCheckIcon className="mt-0.5 size-3 shrink-0" />
                  No public gallery or profile.
                </li>
                <li className="flex gap-2">
                  <ShieldCheckIcon className="mt-0.5 size-3 shrink-0" />
                  GPS metadata embedded in uploaded photos is ignored; coordinates come
                  only from manual input.
                </li>
                <li className="flex gap-2">
                  <ShieldCheckIcon className="mt-0.5 size-3 shrink-0" />
                  Service-role keys never reach the browser.
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImagesIcon className="size-3.5 text-muted-foreground" />
                Manually maintained data
              </CardTitle>
              <CardDescription>
                Fleet details, registration and status are entered and verified by you.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-[11.5px] leading-relaxed text-muted-foreground">
              Status changes such as active, retired, scrapped and transferred are recorded
              by hand with their dates and notes. TransitSpotter does not claim any
              automatic synchronisation with a transit agency.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Built on</CardTitle>
              <CardDescription>
                A deliberately small, portable stack.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-[11.5px] text-muted-foreground">
              <div className="flex flex-wrap gap-1.5">
                {["Next.js 16", "React 19", "TypeScript", "Tailwind CSS 4", "Supabase", "Leaflet", "Recharts"].map(
                  (item) => (
                    <Badge key={item} variant="secondary" className="font-normal">
                      {item}
                    </Badge>
                  ),
                )}
              </div>
              <p>
                Version {APP_VERSION} · <Link href="/api/health" className="text-primary hover:underline">/api/health</Link>{" "}
                reports configuration status without exposing secrets.
              </p>
              <p>
                Not affiliated with TransLink or any other transit agency.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
