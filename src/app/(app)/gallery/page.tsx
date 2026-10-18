import type { Metadata } from "next";
import Link from "next/link";
import { ImagesIcon, PlusIcon, SearchXIcon } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Pagination } from "@/components/common/pagination";
import { Button } from "@/components/ui/button";
import { GalleryToolbar } from "@/components/gallery/gallery-toolbar";
import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { getArchiveFacets } from "@/lib/queries/facets";
import { listGalleryPhotos, parseGalleryFilters } from "@/lib/queries/gallery";
import { paginationParams } from "@/lib/queries/params";
import { getSignedUrlMap } from "@/lib/photos-server";
import { getViewer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Photo gallery" };

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await getViewer();
  const params = await searchParams;
  const filters = parseGalleryFilters(params, viewer.preferences.gallery_density);

  const [result, facets] = await Promise.all([
    listGalleryPhotos(filters),
    getArchiveFacets(),
  ]);

  const signedUrls = await getSignedUrlMap(result.rows.map((photo) => photo.storage_path));
  const urls = Object.fromEntries(signedUrls);

  const hasFilters = Boolean(
    filters.q ||
      filters.operator ||
      filters.manufacturer ||
      filters.model ||
      filters.route ||
      filters.location ||
      filters.from ||
      filters.to,
  );

  const paginationValues = paginationParams({
    q: filters.q,
    operator: filters.operator,
    manufacturer: filters.manufacturer,
    model: filters.model,
    route: filters.route,
    location: filters.location,
    from: filters.from,
    to: filters.to,
    density: filters.density,
  });

  const photoItems = result.rows.map((photo) => ({
    id: photo.id,
    url: urls[photo.storage_path] ?? null,
    caption: photo.caption,
    altText: photo.alt_text,
    filename: photo.original_filename,
    width: photo.width,
    height: photo.height,
    spottedAt: photo.spotted_at,
    route: photo.route,
    locationName: photo.location_name,
    operatorName: photo.operator_name,
    fleetNumber: photo.fleet_number,
    sightingId: photo.sighting_id,
    vehicleId: photo.vehicle_id,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Archive · photographs"
        title="Photo gallery"
        description="The photographic side of your archive, organised by the sightings and vehicles behind each frame."
        actions={
          <Button asChild size="sm">
            <Link href="/sightings/new">
              <PlusIcon />
              Add sighting
            </Link>
          </Button>
        }
      />

      <GalleryToolbar
        filters={filters}
        facets={facets}
        total={result.count}
        timeZone={viewer.timeZone}
      />

      {result.count === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={SearchXIcon}
            title="No photographs match these filters"
            description="Try a different operator, route or date range, or clear the filters to return to the full archive."
            action={
              <Button asChild variant="outline">
                <Link href="/gallery">Reset filters</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={ImagesIcon}
            eyebrow="The archive is empty"
            title="Your photographs will live here"
            description="Photographs are uploaded to sightings. Record a sighting with one or more images and the gallery fills itself."
            action={
              <Button asChild>
                <Link href="/sightings/new">
                  <PlusIcon />
                  Record a sighting
                </Link>
              </Button>
            }
            secondaryAction={
              <Button asChild variant="outline">
                <Link href="/fleet">Browse the fleet database</Link>
              </Button>
            }
          />
        )
      ) : (
        <GalleryGrid
          photos={photoItems}
          density={filters.density}
          timeZone={viewer.timeZone}
          dateStyle={viewer.preferences.date_style}
          timeFormat={viewer.preferences.time_format}
        />
      )}

      <Pagination
        basePath="/gallery"
        params={paginationValues}
        page={result.page}
        pageCount={result.pageCount}
        total={result.count}
        pageSize={result.pageSize}
        itemLabel="photographs"
      />
    </div>
  );
}
