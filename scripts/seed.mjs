#!/usr/bin/env node
/**
 * Seeds a development account with clearly-labelled example records.
 *
 * This is NOT production data and never runs automatically. It uses the public
 * anon key plus a signed-in demo user, so every insert still passes through
 * Row Level Security. If SUPABASE_SERVICE_ROLE_KEY is provided, the script can
 * create the demo user first.
 *
 * Required environment (or .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   DEMO_EMAIL
 *   DEMO_PASSWORD
 * Optional:
 *   SUPABASE_SERVICE_ROLE_KEY   creates the demo user if it does not exist
 *   SEED_PHOTOS_DIR              directory of JPEG/PNG/WebP files to attach
 *   NEXT_PUBLIC_SUPABASE_PHOTO_BUCKET
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function loadEnvLocal() {
  try {
    const raw = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (!match) continue;
      const [, key, value] = match;
      if (process.env[key] === undefined) process.env[key] = value.replace(/^["']|["']$/g, "");
    }
  } catch {
    // optional
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.DEMO_EMAIL;
const password = process.env.DEMO_PASSWORD;
const bucket = process.env.NEXT_PUBLIC_SUPABASE_PHOTO_BUCKET || "photos";
const photosDir = process.env.SEED_PHOTOS_DIR;

if (!url || !anonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}
if (!email || !password) {
  console.error("Set DEMO_EMAIL and DEMO_PASSWORD to an existing confirmed account.");
  process.exit(1);
}

function isoDaysAgo(days, hour = 14, minute = 20) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function isoDateDaysAgo(days) {
  return isoDaysAgo(days).slice(0, 10);
}

if (serviceKey) {
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: "Demo Spotter" },
  });
  if (error && !/already|registered|exists/i.test(error.message)) {
    console.error(`Could not create demo user: ${error.message}`);
    process.exit(1);
  }
}

const supabase = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email,
  password,
});
if (authError) {
  console.error(`Demo sign-in failed: ${authError.message}`);
  process.exit(1);
}
const userId = authData.user.id;

const { count: existingOperators, error: countError } = await supabase
  .from("operators")
  .select("*", { count: "exact", head: true });
if (countError) {
  console.error(`Could not inspect the account: ${countError.message}`);
  process.exit(1);
}

if (process.argv.includes("--reset") && (existingOperators ?? 0) > 0) {
  console.log("Resetting the demo account's archive …");
  const { data: photoRows } = await supabase
    .from("photos")
    .select("storage_path");
  const paths = (photoRows ?? []).map((row) => row.storage_path);
  for (let index = 0; index < paths.length; index += 100) {
    const group = paths.slice(index, index + 100);
    const { error } = await supabase.storage.from(bucket).remove(group);
    if (error) console.warn(`Storage cleanup warning: ${error.message}`);
  }
  const { error: vehicleError } = await supabase.from("vehicles").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (vehicleError) {
    console.error(`Could not reset vehicles: ${vehicleError.message}`);
    process.exit(1);
  }
  const { error: operatorError } = await supabase
    .from("operators")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (operatorError) {
    console.error(`Could not reset operators: ${operatorError.message}`);
    process.exit(1);
  }
  console.log(`  removed ${paths.length} photograph file(s) and all demo records`);
}

if ((existingOperators ?? 0) > 0 && !process.argv.includes("--reset")) {
  console.log("This account already has operator records. Seed skipped to avoid duplicates.");
  console.log("Run with --reset to replace the demo archive, or use a fresh account.");
  process.exit(0);
}

// --------------------------------------------------------------------------
// Example data (development only — Metro Vancouver-flavoured but user-owned)
// --------------------------------------------------------------------------
const operators = [
  {
    name: "Coast Mountain Bus Company",
    abbreviation: "CMBC",
    region: "Metro Vancouver, BC",
    ownership_type: "Public",
    notes: "Example operator record created by the development seed script.",
  },
  {
    name: "West Vancouver Blue Bus",
    abbreviation: "WVBB",
    region: "West Vancouver, BC",
    ownership_type: "Public",
    notes: "Example operator record created by the development seed script.",
  },
];

const vehicleSeeds = [
  {
    operator: 0,
    fleet_number: "1204",
    manufacturer: "New Flyer",
    model: "XN40",
    generation: "2019 order",
    vehicle_category: "Standard bus",
    powertrain: "Compressed natural gas",
    length_m: 12.19,
    model_year: 2021,
    in_service_year: 2021,
    status: "active",
    status_verified_on: isoDateDaysAgo(12),
    notes: "Example fleet record. Rear door sensor replaced in 2024.",
  },
  {
    operator: 0,
    fleet_number: "8102",
    manufacturer: "New Flyer",
    model: "XDE60",
    generation: "Articulated",
    vehicle_category: "Articulated bus",
    powertrain: "Diesel-electric hybrid",
    length_m: 18.0,
    model_year: 2019,
    in_service_year: 2019,
    status: "active",
    status_verified_on: isoDateDaysAgo(40),
    notes: "Example fleet record, normally allocated to rapid routes.",
  },
  {
    operator: 0,
    fleet_number: "2501",
    manufacturer: "Nova Bus",
    model: "LFS",
    generation: "3rd generation",
    vehicle_category: "Standard bus",
    powertrain: "Diesel",
    length_m: 12.07,
    model_year: 2016,
    in_service_year: 2016,
    status: "active",
    status_verified_on: isoDateDaysAgo(75),
    notes: "Example fleet record.",
  },
  {
    operator: 0,
    fleet_number: "2519",
    manufacturer: "Nova Bus",
    model: "LFS",
    generation: "3rd generation",
    vehicle_category: "Standard bus",
    powertrain: "Diesel",
    length_m: 12.07,
    model_year: 2016,
    in_service_year: 2017,
    status: "transferred",
    status_verified_on: isoDateDaysAgo(120),
    notes: "Example fleet record. Manually marked as transferred.",
  },
  {
    operator: 0,
    fleet_number: "3401",
    manufacturer: "Alexander Dennis",
    model: "Enviro500 MMC",
    generation: "Facelift",
    vehicle_category: "Double-decker bus",
    powertrain: "Diesel",
    length_m: 12.9,
    model_year: 2017,
    in_service_year: 2017,
    status: "active",
    status_verified_on: isoDateDaysAgo(30),
    notes: "Example fleet record.",
  },
  {
    operator: 0,
    fleet_number: "2140",
    manufacturer: "New Flyer",
    model: "E40LFR",
    generation: "Trolley",
    vehicle_category: "Trolleybus",
    powertrain: "Trolley-electric",
    length_m: 12.19,
    model_year: 2007,
    in_service_year: 2007,
    status: "retired",
    status_verified_on: isoDateDaysAgo(220),
    notes: "Example fleet record with a manually recorded retirement.",
  },
  {
    operator: 1,
    fleet_number: "601",
    manufacturer: "Nova Bus",
    model: "LFS",
    generation: "4th generation",
    vehicle_category: "Standard bus",
    powertrain: "Diesel-electric hybrid",
    length_m: 12.07,
    model_year: 2018,
    in_service_year: 2018,
    status: "active",
    status_verified_on: isoDateDaysAgo(18),
    notes: "Example fleet record for a smaller municipal operator.",
  },
];

const sightingSeeds = [
  { vehicle: 0, days: 3, hour: 8, minute: 12, route: "25", direction: "Downtown", location: "Commercial–Broadway station", lat: 49.2623, lng: -123.0691, camera: "Sony A7 III", lens: "24–70mm f/2.8", aperture: "f/4", shutter: "1/500", iso: 320, focal: "45mm", weather: "Overcast, soft light", notes: "Pulling out of the station loop." },
  { vehicle: 1, days: 7, hour: 17, minute: 45, route: "R4", direction: "UBC", location: "41st Avenue at Cambie", lat: 49.2497, lng: -123.1159, camera: "Sony A7 III", lens: "70–200mm f/4", aperture: "f/4", shutter: "1/640", iso: 800, focal: "135mm", weather: "Golden hour", notes: "Articulated unit on the rapid corridor." },
  { vehicle: 2, days: 12, hour: 12, minute: 5, route: "49", direction: "Metrotown", location: "Tolmie Street at 49th", lat: 49.2325, lng: -123.1745, camera: "Fujifilm X-T4", lens: "35mm f/1.4", aperture: "f/2.8", shutter: "1/1000", iso: 200, focal: "35mm", weather: "Bright sun", notes: "Clean side profile in full sun." },
  { vehicle: 4, days: 18, hour: 9, minute: 30, route: "N19", direction: "Surrey Centre", location: "Sutherland Avenue", lat: 49.3208, lng: -123.0732, camera: "Sony A7 III", lens: "24–70mm f/2.8", aperture: "f/5.6", shutter: "1/800", iso: 400, focal: "50mm", weather: "Clear morning", notes: "Double-decker on the night route." },
  { vehicle: 5, days: 32, hour: 15, minute: 55, route: "14", direction: "Hastings", location: "Hastings Street at Renfrew", lat: 49.2811, lng: -123.0394, camera: "Sony A7 III", lens: "24–70mm f/2.8", aperture: "f/4.5", shutter: "1/400", iso: 640, focal: "62mm", weather: "Light rain", notes: "Trolley poles on the wires." },
  { vehicle: 6, days: 44, hour: 11, minute: 20, route: "250", direction: "Horseshoe Bay", location: "Park Royal", lat: 49.3276, lng: -123.1361, camera: "Fujifilm X-T4", lens: "18–55mm f/2.8", aperture: "f/4", shutter: "1/700", iso: 250, focal: "40mm", weather: "Overcast", notes: "Blue Bus hybrid at the exchange." },
  { vehicle: 0, days: 58, hour: 7, minute: 48, route: "25", direction: "Brentwood", location: "Nanaimo station", lat: 49.2483, lng: -123.0521, camera: "Sony A7 III", lens: "24–70mm f/2.8", aperture: "f/4", shutter: "1/500", iso: 320, focal: "38mm", weather: "Morning haze", notes: "Second sighting of this unit." },
  { vehicle: 3, days: 71, hour: 16, minute: 10, route: "100", direction: "22nd Street", location: "Marine Drive at Fraser", lat: 49.2089, lng: -123.0908, camera: "Sony A7 III", lens: "70–200mm f/4", aperture: "f/5", shutter: "1/800", iso: 500, focal: "150mm", weather: "Cloudy", notes: "Transferred unit still in old livery." },
  { vehicle: 1, days: 86, hour: 18, minute: 25, route: "R4", direction: "Downtown", location: "Granville Street bridge approach", lat: 49.2718, lng: -123.1348, camera: "Sony A7 III", lens: "24–70mm f/2.8", aperture: "f/3.5", shutter: "1/640", iso: 1000, focal: "55mm", weather: "Dusk", notes: "Long exposure of the loop ramp." },
  { vehicle: 2, days: 101, hour: 13, minute: 40, route: "49", direction: "UBC", location: "Dunbar Loop", lat: 49.2493, lng: -123.1849, camera: "Fujifilm X-T4", lens: "35mm f/1.4", aperture: "f/5.6", shutter: "1/1000", iso: 200, focal: "35mm", weather: "Clear", notes: "Layover at the loop." },
  { vehicle: 4, days: 118, hour: 10, minute: 5, route: "N19", direction: "Downtown", location: "Metrotown station", lat: 49.2256, lng: -123.0038, camera: "Sony A7 III", lens: "24–70mm f/2.8", aperture: "f/4", shutter: "1/800", iso: 320, focal: "48mm", weather: "Bright but cold", notes: "" },
  { vehicle: 0, days: 143, hour: 9, minute: 15, route: "N19", direction: "Surrey Centre", location: "King George station", lat: 49.1826, lng: -122.8447, camera: "Sony A7 III", lens: "24–70mm f/2.8", aperture: "f/4", shutter: "1/500", iso: 400, focal: "70mm", weather: "Fog", notes: "Working a night route in daylight hours." },
  { vehicle: 6, days: 166, hour: 14, minute: 30, route: "250", direction: "Vancouver", location: "Dundarave", lat: 49.3364, lng: -123.1852, camera: "Fujifilm X-T4", lens: "18–55mm f/2.8", aperture: "f/4", shutter: "1/900", iso: 160, focal: "30mm", weather: "Sunny", notes: "Seaside terminus." },
  { vehicle: 5, days: 191, hour: 17, minute: 5, route: "14", direction: "UBC", location: "Main Street at Broadway", lat: 49.2635, lng: -123.1007, camera: "Sony A7 III", lens: "24–70mm f/2.8", aperture: "f/4", shutter: "1/320", iso: 800, focal: "52mm", weather: "Blue hour", notes: "Trolley returning to the depot." },
];

console.log(`Seeding development data for ${email} …`);

const operatorIds = [];
for (const operator of operators) {
  const { data, error } = await supabase
    .from("operators")
    .insert({ user_id: userId, ...operator })
    .select("id")
    .single();
  if (error) {
    console.error(`Operator insert failed: ${error.message}`);
    process.exit(1);
  }
  operatorIds.push(data.id);
}

const vehicleIds = [];
for (const seed of vehicleSeeds) {
  const { operator, ...fields } = seed;
  const { data, error } = await supabase
    .from("vehicles")
    .insert({ user_id: userId, operator_id: operatorIds[operator], ...fields })
    .select("id, status")
    .single();
  if (error) {
    console.error(`Vehicle insert failed: ${error.message}`);
    process.exit(1);
  }
  vehicleIds.push(data.id);

  const historyRows = [];
  if (seed.status === "active") {
    historyRows.push({
      user_id: userId,
      vehicle_id: data.id,
      previous_status: null,
      new_status: "active",
      changed_on: isoDateDaysAgo(300),
      notes: "Example initial status from the development seed.",
    });
  } else if (seed.status === "retired") {
    historyRows.push(
      {
        user_id: userId,
        vehicle_id: data.id,
        previous_status: null,
        new_status: "active",
        changed_on: isoDateDaysAgo(1000),
        notes: "Entered service (example record).",
      },
      {
        user_id: userId,
        vehicle_id: data.id,
        previous_status: "active",
        new_status: "retired",
        changed_on: seed.status_verified_on,
        notes: "Withdrawn from service (example record).",
      },
    );
  } else if (seed.status === "transferred") {
    historyRows.push({
      user_id: userId,
      vehicle_id: data.id,
      previous_status: "active",
      new_status: "transferred",
      changed_on: seed.status_verified_on,
      notes: "Moved to another operator (example record).",
    });
  }
  if (historyRows.length > 0) {
    const { error: historyError } = await supabase
      .from("vehicle_status_history")
      .insert(historyRows);
    if (historyError) {
      console.error(`Status history insert failed: ${historyError.message}`);
      process.exit(1);
    }
  }
}

const sightingIds = [];
for (const seed of sightingSeeds) {
  const {
    vehicle,
    days,
    hour,
    minute,
    camera,
    shutter,
    focal,
    location,
    lat,
    lng,
    ...fields
  } = seed;
  const { data, error } = await supabase
    .from("sightings")
    .insert({
      user_id: userId,
      vehicle_id: vehicleIds[vehicle],
      spotted_at: isoDaysAgo(days, hour, minute),
      camera_model: camera,
      shutter_speed: shutter,
      focal_length: focal,
      location_name: location,
      latitude: lat,
      longitude: lng,
      ...fields,
    })
    .select("id, vehicle_id")
    .single();
  if (error) {
    console.error(`Sighting insert failed: ${error.message}`);
    process.exit(1);
  }
  sightingIds.push(data);
}

// Optional sample photographs.
let photoCount = 0;
if (photosDir) {
  let files = [];
  try {
    files = readdirSync(photosDir).filter((name) =>
      [".jpg", ".jpeg", ".png", ".webp"].includes(extname(name).toLowerCase()),
    );
  } catch {
    console.warn(`SEED_PHOTOS_DIR could not be read (${photosDir}); skipping photos.`);
  }

  const mimeFor = (name) => {
    const extension = extname(name).toLowerCase();
    if (extension === ".png") return "image/png";
    if (extension === ".webp") return "image/webp";
    return "image/jpeg";
  };

  for (let index = 0; index < Math.min(files.length, sightingIds.length); index += 1) {
    const file = files[index];
    const sighting = sightingIds[index];
    const body = readFileSync(join(photosDir, file));
    const extension = extname(file).toLowerCase();
    const path = `${userId}/${sighting.id}/${randomUUID()}${extension}`;
    const mime = mimeFor(file);

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, body, { contentType: mime, upsert: false });
    if (uploadError) {
      console.warn(`Photo upload failed for ${file}: ${uploadError.message}`);
      continue;
    }

    const { error: photoError } = await supabase.from("photos").insert({
      user_id: userId,
      sighting_id: sighting.id,
      storage_path: path,
      original_filename: file,
      mime_type: mime,
      file_size: statSync(join(photosDir, file)).size,
      sort_order: 0,
      is_cover: true,
      caption: "Sample photograph from the development seed.",
      alt_text: "Illustrative sample image supplied with the development seed data.",
    });
    if (photoError) {
      console.warn(`Photo record failed for ${file}: ${photoError.message}`);
      continue;
    }
    photoCount += 1;

    const { data: photo } = await supabase
      .from("photos")
      .select("id")
      .eq("storage_path", path)
      .maybeSingle();
    if (photo) {
      const { data: vehicle } = await supabase
        .from("vehicles")
        .select("cover_photo_id")
        .eq("id", sighting.vehicle_id)
        .maybeSingle();
      if (vehicle && !vehicle.cover_photo_id) {
        await supabase
          .from("vehicles")
          .update({ cover_photo_id: photo.id })
          .eq("id", sighting.vehicle_id);
      }
    }
  }
}

console.log("");
console.log("Seed complete:");
console.log(`  operators: ${operatorIds.length}`);
console.log(`  vehicles:  ${vehicleIds.length}`);
console.log(`  sightings: ${sightingIds.length}`);
console.log(`  photos:    ${photoCount}`);
if (!photosDir) {
  console.log("  (no photographs seeded — set SEED_PHOTOS_DIR to attach images)");
}
console.log("");
console.log("These records are development examples and can be deleted from the app.");
