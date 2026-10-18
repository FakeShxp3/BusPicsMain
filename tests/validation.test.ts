import { describe, expect, it } from "vitest";
import {
  operatorSchema,
  photoRegistrationSchema,
  sightingSchema,
  statusChangeSchema,
  vehicleCreateSchema,
  vehicleStatusSchema,
} from "@/lib/validation/schemas";

const VEHICLE_ID = "11111111-1111-4111-8111-111111111111";
const SIGHTING_ID = "22222222-2222-4222-8222-222222222222";
const USER_ID = "33333333-3333-4333-8333-333333333333";

describe("operator validation", () => {
  it("requires a name", () => {
    expect(operatorSchema.safeParse({ name: "   " }).success).toBe(false);
    expect(operatorSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("trims text and converts blank optional fields to null", () => {
    const parsed = operatorSchema.parse({
      name: "  TransLink  ",
      abbreviation: "  TL ",
      region: "   ",
      ownership_type: null,
      notes: "",
    });
    expect(parsed.name).toBe("TransLink");
    expect(parsed.abbreviation).toBe("TL");
    expect(parsed.region).toBeNull();
    expect(parsed.ownership_type).toBeNull();
    expect(parsed.notes).toBeNull();
  });
});

describe("vehicle validation", () => {
  it("allows unknown technical information", () => {
    const parsed = vehicleCreateSchema.parse({
      operator_id: null,
      fleet_number: "",
      manufacturer: "",
      model: "",
      generation: "",
      vehicle_category: "",
      powertrain: "",
      length_m: "",
      model_year: "",
      in_service_year: "",
      notes: "",
    });
    expect(parsed.fleet_number).toBeNull();
    expect(parsed.length_m).toBeNull();
    expect(parsed.model_year).toBeNull();
    expect(parsed.status).toBe("unknown");
  });

  it("coerces numeric strings and enforces physical limits", () => {
    const parsed = vehicleCreateSchema.parse({
      length_m: "12.2",
      model_year: "2021",
      in_service_year: "2022",
    });
    expect(parsed.length_m).toBe(12.2);
    expect(parsed.model_year).toBe(2021);
    expect(parsed.in_service_year).toBe(2022);

    expect(vehicleCreateSchema.safeParse({ length_m: "0" }).success).toBe(false);
    expect(vehicleCreateSchema.safeParse({ length_m: "999" }).success).toBe(false);
    expect(vehicleCreateSchema.safeParse({ model_year: "1800" }).success).toBe(false);
  });

  it("validates status values", () => {
    expect(vehicleStatusSchema.parse("retired")).toBe("retired");
    expect(vehicleStatusSchema.safeParse("unknownish").success).toBe(false);
  });

  it("rejects a partially supplied coordinate pair", () => {
    const base = {
      vehicle_id: VEHICLE_ID,
      spotted_at: "2026-10-17T19:36:00.000Z",
    };
    expect(sightingSchema.safeParse(base).success).toBe(true);
    expect(
      sightingSchema.safeParse({ ...base, latitude: "49.28" }).success,
    ).toBe(false);
    expect(
      sightingSchema.safeParse({ ...base, longitude: "-123.12" }).success,
    ).toBe(false);
    expect(
      sightingSchema.safeParse({
        ...base,
        latitude: "49.28",
        longitude: "-123.12",
      }).success,
    ).toBe(true);
  });

  it("normalises submission dates to ISO instants", () => {
    const parsed = sightingSchema.parse({
      vehicle_id: VEHICLE_ID,
      spotted_at: "2026-10-17T19:36:00.000Z",
      latitude: "49.2827",
      longitude: "-123.1207",
    });
    expect(parsed.spotted_at).toBe("2026-10-17T19:36:00.000Z");
    expect(parsed.latitude).toBe(49.2827);
    expect(parsed.longitude).toBe(-123.1207);
    expect(parsed.route).toBeNull();
  });

  it("rejects invalid dates", () => {
    expect(
      sightingSchema.safeParse({
        vehicle_id: VEHICLE_ID,
        spotted_at: "not-a-date",
      }).success,
    ).toBe(false);
  });

  it("validates status changes independently of vehicle edits", () => {
    expect(
      statusChangeSchema.parse({ status: "scrapped", changed_on: "2026-10-17" })
        .status,
    ).toBe("scrapped");
    expect(
      statusChangeSchema.safeParse({ status: "exploded" }).success,
    ).toBe(false);
  });
});

describe("photo validation", () => {
  const base = {
    sighting_id: SIGHTING_ID,
    storage_path: `${USER_ID}/${SIGHTING_ID}/image.jpg`,
    original_filename: "bus.jpg",
    mime_type: "image/jpeg",
    file_size: 2048,
  };

  it("accepts supported image types", () => {
    expect(photoRegistrationSchema.safeParse(base).success).toBe(true);
    expect(
      photoRegistrationSchema.safeParse({ ...base, mime_type: "image/png" }).success,
    ).toBe(true);
    expect(
      photoRegistrationSchema.safeParse({ ...base, mime_type: "image/webp" }).success,
    ).toBe(true);
  });

  it("rejects unsupported files", () => {
    expect(
      photoRegistrationSchema.safeParse({ ...base, mime_type: "text/plain" }).success,
    ).toBe(false);
    expect(
      photoRegistrationSchema.safeParse({ ...base, mime_type: "image/heic" }).success,
    ).toBe(false);
    expect(
      photoRegistrationSchema.safeParse({ ...base, file_size: 0 }).success,
    ).toBe(false);
  });
});
