import type {
  GalleryDensity,
  Units,
  VehicleStatus,
} from "@/lib/db/database.types";

export const APP_NAME = "TransitSpotter";
export const APP_TAGLINE = "A private field notebook for bus photography";
export const APP_VERSION = "1.0.0";

export const VEHICLE_STATUSES: VehicleStatus[] = [
  "active",
  "retired",
  "scrapped",
  "transferred",
  "unknown",
];

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  active: "Active",
  retired: "Retired",
  scrapped: "Scrapped",
  transferred: "Transferred",
  unknown: "Unknown",
};

export const VEHICLE_STATUS_HINTS: Record<VehicleStatus, string> = {
  active: "Believed to still be in service",
  retired: "Withdrawn from service",
  scrapped: "Physically disposed of",
  transferred: "Moved to another operator or depot",
  unknown: "Status not yet verified",
};

/** Suggested values only. All of these fields accept free text. */
export const VEHICLE_CATEGORY_SUGGESTIONS = [
  "Standard bus",
  "Articulated bus",
  "Double-decker bus",
  "Trolleybus",
  "Minibus",
  "Coach",
  "Other",
];

export const POWERTRAIN_SUGGESTIONS = [
  "Diesel",
  "Diesel-electric hybrid",
  "Battery-electric",
  "Trolley-electric",
  "Hydrogen fuel cell",
  "Other",
];

export const MANUFACTURER_SUGGESTIONS = [
  "New Flyer",
  "Nova Bus",
  "Alexander Dennis",
  "Gillig",
  "BYD",
  "Volvo",
  "Mercedes-Benz",
  "MAN",
  "Scania",
  "Solaris",
  "Wrightbus",
  "VDL",
  "Proterra",
  "MCI",
  "Prevost",
  "Other",
];

export const OWNERSHIP_TYPE_SUGGESTIONS = [
  "Public",
  "Private",
  "Crown corporation",
  "Cooperative",
  "Other",
];

export const ROUTE_SUGGESTIONS = [
  "N19",
  "R1",
  "R4",
  "25",
  "49",
  "99",
  "106",
  "319",
];

export const DEFAULT_MAP_CENTER = {
  lat: 49.2827,
  lng: -123.1207,
  zoom: 11,
} as const;

export const VEHICLE_PAGE_SIZE = 18;
export const SIGHTING_PAGE_SIZE = 20;

export const GALLERY_PAGE_SIZE: Record<GalleryDensity, number> = {
  compact: 60,
  comfortable: 36,
  spacious: 24,
};

export const GALLERY_GRID_CLASSES: Record<GalleryDensity, string> = {
  compact: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6",
  comfortable: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4",
  spacious: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
};

export const GALLERY_COLUMN_CLASSES: Record<GalleryDensity, string> = {
  compact: "columns-2 sm:columns-3 lg:columns-4 xl:columns-6",
  comfortable: "columns-1 sm:columns-2 lg:columns-3 xl:columns-4",
  spacious: "columns-1 sm:columns-2 xl:columns-3",
};

export const LENGTH_UNIT: Record<Units, string> = {
  metric: "m",
  imperial: "ft",
};

export const MAX_PHOTOS_PER_UPLOAD = 24;
export const MAX_PHOTOS_PER_SIGHTING = 60;

export const SIGNED_URL_TTL_SECONDS = 60 * 60;

export const EXPORT_PHOTO_LIMIT = 400;

export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export const DATE_STYLE_LABELS = {
  medium: "Oct 17, 2026",
  short: "2026-10-17",
  iso: "2026-10-17 (ISO)",
  long: "October 17, 2026",
} as const;

export const UNITS_LABELS = {
  metric: "Metric (metres, kilometres)",
  imperial: "Imperial (feet, miles)",
} as const;
