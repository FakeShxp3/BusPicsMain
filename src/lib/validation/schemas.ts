import { z } from "zod";

const nullIfEmpty = (value: unknown): unknown => {
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
};

const trimIfString = (value: unknown): unknown =>
  typeof value === "string" ? value.trim() : value;

/** Optional free-text field: trims, converts empty values to null, enforces a max length. */
export function optionalText(max: number, label = "This field") {
  return z.preprocess(
    (value) => {
      const trimmed = trimIfString(nullIfEmpty(value));
      return trimmed;
    },
    z
      .string()
      .max(max, `${label} must be ${max} characters or fewer`)
      .nullable()
      .optional(),
  ).transform((value) => (value === undefined ? null : value));
}

export const requiredText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .min(1, message)
    .max(max, message);

function optionalNumber(min: number, max: number, label: string) {
  return z.preprocess(
    (value) => {
      const cleaned = nullIfEmpty(value);
      if (cleaned === null) return null;
      if (typeof cleaned === "string") {
        const parsed = Number(cleaned);
        return Number.isNaN(parsed) ? cleaned : parsed;
      }
      return cleaned;
    },
    z
      .number({ error: `${label} must be a number` })
      .min(min, `${label} must be at least ${min}`)
      .max(max, `${label} must be at most ${max}`)
      .nullable()
      .optional(),
  ).transform((value) => (value === undefined ? null : value));
}

function optionalInteger(min: number, max: number, label: string) {
  return z.preprocess(
    (value) => {
      const cleaned = nullIfEmpty(value);
      if (cleaned === null) return null;
      if (typeof cleaned === "string") {
        const parsed = Number(cleaned);
        return Number.isNaN(parsed) ? cleaned : parsed;
      }
      return cleaned;
    },
    z
      .number({ error: `${label} must be a number` })
      .int(`${label} must be a whole number`)
      .min(min, `${label} must be between ${min} and ${max}`)
      .max(max, `${label} must be between ${min} and ${max}`)
      .nullable()
      .optional(),
  ).transform((value) => (value === undefined ? null : value));
}

export const optionalUuid = z
  .preprocess(
    (value) => nullIfEmpty(trimIfString(value)),
    z.string().uuid("Select a valid record").nullable().optional(),
  )
  .transform((value) => (value === undefined ? null : value));

export const requiredUuid = z.string().uuid("A valid record is required");

const optionalDateOnly = z
  .preprocess(
    (value) => nullIfEmpty(trimIfString(value)),
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date in YYYY-MM-DD format")
      .nullable()
      .optional(),
  )
  .transform((value) => (value === undefined ? null : value));

const isoInstant = z.preprocess(
  (value) => {
    if (typeof value === "string" && value.trim()) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date.toISOString();
    }
    return value;
  },
  z
    .string()
    .min(1, "Enter a date and time")
    .refine((value) => !Number.isNaN(new Date(value).getTime()), "Enter a valid date and time"),
);

const coordinatePair = <T extends { latitude: number | null; longitude: number | null }>(
  schema: z.ZodType<T>,
) =>
  schema.superRefine((value, context) => {
    if ((value.latitude === null) !== (value.longitude === null)) {
      context.addIssue({
        code: "custom",
        path: ["latitude"],
        message: "Latitude and longitude must be provided together.",
      });
    }
  });

// ---------------------------------------------------------------------------
// Operators
// ---------------------------------------------------------------------------
export const operatorSchema = z.object({
  name: requiredText(120, "Operator name is required"),
  abbreviation: optionalText(24, "Abbreviation"),
  region: optionalText(120, "Region"),
  ownership_type: optionalText(60, "Ownership type"),
  notes: optionalText(10000, "Notes"),
});

// ---------------------------------------------------------------------------
// Vehicles
// ---------------------------------------------------------------------------
export const vehicleCoreSchema = z.object({
  operator_id: optionalUuid,
  fleet_number: optionalText(40, "Fleet number"),
  manufacturer: optionalText(120, "Manufacturer"),
  model: optionalText(120, "Model"),
  generation: optionalText(120, "Generation"),
  vehicle_category: optionalText(60, "Vehicle category"),
  powertrain: optionalText(60, "Powertrain"),
  length_m: optionalNumber(0.1, 60, "Length"),
  model_year: optionalInteger(1900, 2200, "Model year"),
  in_service_year: optionalInteger(1900, 2200, "In-service year"),
  notes: optionalText(20000, "Notes"),
});

export const vehicleStatusSchema = z.enum([
  "active",
  "retired",
  "scrapped",
  "transferred",
  "unknown",
]);

export const vehicleCreateSchema = vehicleCoreSchema.extend({
  status: vehicleStatusSchema.default("unknown"),
  status_verified_on: optionalDateOnly,
  status_note: optionalText(5000, "Status note"),
});

export const vehicleUpdateSchema = vehicleCoreSchema;

export const statusChangeSchema = z.object({
  status: vehicleStatusSchema,
  changed_on: optionalDateOnly,
  notes: optionalText(5000, "Status note"),
});

// ---------------------------------------------------------------------------
// Sightings
// ---------------------------------------------------------------------------
export const sightingSchema = coordinatePair(
  z.object({
    vehicle_id: requiredUuid,
    spotted_at: isoInstant,
    route: optionalText(80, "Route"),
    direction: optionalText(160, "Direction"),
    location_name: optionalText(200, "Location name"),
    latitude: optionalNumber(-90, 90, "Latitude"),
    longitude: optionalNumber(-180, 180, "Longitude"),
    camera_model: optionalText(120, "Camera"),
    lens: optionalText(120, "Lens"),
    aperture: optionalText(40, "Aperture"),
    shutter_speed: optionalText(40, "Shutter speed"),
    iso: optionalInteger(1, 1000000, "ISO"),
    focal_length: optionalText(40, "Focal length"),
    weather: optionalText(160, "Weather"),
    notes: optionalText(20000, "Notes"),
  }),
);

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------
export const photoRegistrationSchema = z.object({
  sighting_id: requiredUuid,
  storage_path: z.string().min(1).max(500),
  original_filename: z.string().trim().min(1).max(255),
  mime_type: z.enum(["image/jpeg", "image/png", "image/webp"]),
  file_size: z.number().int().positive().max(26214400),
  width: z.number().int().positive().max(100000).nullable().optional(),
  height: z.number().int().positive().max(100000).nullable().optional(),
});

export const photoMetadataSchema = z.object({
  caption: optionalText(500, "Caption"),
  alt_text: optionalText(500, "Alt text"),
});

export const photoCoverSchema = z.object({
  photo_id: requiredUuid,
});

export const photoReorderSchema = z.object({
  sighting_id: requiredUuid,
  photo_ids: z.array(requiredUuid).min(1).max(60),
});

export const vehicleCoverSchema = z.object({
  photo_id: requiredUuid.nullable(),
});

export const bulkDeleteSchema = z.object({
  ids: z.array(requiredUuid).min(1).max(50),
});

export type OperatorInput = z.infer<typeof operatorSchema>;
export type VehicleCoreInput = z.infer<typeof vehicleCoreSchema>;
export type VehicleCreateInput = z.infer<typeof vehicleCreateSchema>;
export type SightingInput = z.infer<typeof sightingSchema>;
export type PhotoRegistrationInput = z.infer<typeof photoRegistrationSchema>;
