import Link from "next/link";
import { CompassIcon, HomeIcon, SearchXIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/layout/brand";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md space-y-5 text-center">
        <div className="flex justify-center">
          <Brand />
        </div>
        <div className="mx-auto grid size-11 place-items-center rounded-lg border border-border bg-muted text-muted-foreground">
          <SearchXIcon className="size-5" />
        </div>
        <div className="space-y-2">
          <p className="eyebrow">404 · not found</p>
          <h1 className="text-xl font-semibold tracking-tight">
            That record is not in your archive
          </h1>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            The page may have been deleted, or the link may be mistyped. Your fleet
            database and sightings log are still where you left them.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href="/dashboard">
              <HomeIcon />
              Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/sightings">
              <CompassIcon />
              Sightings
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
