#!/usr/bin/env node
/**
 * Authenticated smoke test against a running TransitSpotter instance.
 *
 * It signs in through Supabase Auth, builds the same session cookie the app
 * uses, then requests every private page and export endpoint. It expects the
 * account to already contain at least one vehicle and one sighting (run the
 * seed script first, or use your own populated account).
 *
 * Environment (reads .env.local too):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   SMOKE_EMAIL / SMOKE_PASSWORD   (falls back to DEMO_EMAIL / DEMO_PASSWORD)
 *   BASE_URL                       default http://127.0.0.1:3000
 *
 * Usage: pnpm dev   (in another terminal)
 *        pnpm smoke
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

const base = process.env.BASE_URL || "http://127.0.0.1:3000";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.SMOKE_EMAIL || process.env.DEMO_EMAIL;
const password = process.env.SMOKE_PASSWORD || process.env.DEMO_PASSWORD;

if (!supabaseUrl || !anon) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}
if (!email || !password) {
  console.error("Set SMOKE_EMAIL / SMOKE_PASSWORD (or DEMO_EMAIL / DEMO_PASSWORD).");
  process.exit(1);
}

const ref = new URL(supabaseUrl).hostname.split(".")[0];
const results = [];

function check(name, condition, detail = "") {
  results.push({ name, ok: Boolean(condition), detail });
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const loginResponse = await fetch(
  `${supabaseUrl}/auth/v1/token?grant_type=password`,
  {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  },
);
if (!loginResponse.ok) {
  console.error(`Sign-in failed: ${loginResponse.status} ${await loginResponse.text()}`);
  process.exit(1);
}
const session = await loginResponse.json();
const token = session.access_token;
const cookie =
  `sb-${ref}-auth-token=base64-` +
  Buffer.from(JSON.stringify(session)).toString("base64url");

async function page(path, { withCookie = true, redirect = "follow" } = {}) {
  const response = await fetch(`${base}${path}`, {
    headers: withCookie ? { cookie } : {},
    redirect,
  });
  const text = await response.text();
  return { status: response.status, headers: response.headers, text };
}

async function rest(path) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: {
      apikey: anon,
      Authorization: `Bearer ${token}`,
      "Accept-Profile": "transitspotter",
    },
  });
  if (!response.ok) throw new Error(`REST ${path} failed (${response.status})`);
  return response.json();
}

const vehicles = await rest(
  "vehicle_overview?select=id,fleet_number,model,manufacturer,operator_name&order=created_at.asc&limit=5",
);
const sightings = await rest("sighting_overview?select=id&order=spotted_at.desc&limit=3");
const photos = await rest("photos?select=id&limit=1");

if (vehicles.length === 0 || sightings.length === 0) {
  console.error(
    "Smoke test needs a populated account (at least one vehicle and one sighting). Run the seed script first.",
  );
  process.exit(1);
}

const vehicle = vehicles[0];
const sighting = sightings[0];
const fleetLabel = vehicle.fleet_number ? `#${vehicle.fleet_number}` : (vehicle.model ?? "");

// ------------------------------------------------------------------ public
{
  const health = await page("/api/health", { withCookie: false });
  check("health endpoint is public", health.status === 200);

  const loginPage = await page("/login", { withCookie: false });
  check(
    "login page renders",
    loginPage.status === 200 && loginPage.text.includes("Sign in to your archive"),
  );

  const dashboardAnon = await page("/dashboard", {
    withCookie: false,
    redirect: "manual",
  });
  check(
    "private pages redirect anonymous visitors to login",
    dashboardAnon.status === 307 &&
      (dashboardAnon.headers.get("location") ?? "").includes("/login"),
    `${dashboardAnon.status}`,
  );
}

// ------------------------------------------------------------------- pages
{
  const dashboard = await page("/dashboard");
  check(
    "dashboard renders real aggregate sections",
    dashboard.status === 200 &&
      dashboard.text.includes("Photography activity") &&
      dashboard.text.includes("By operator") &&
      dashboard.text.includes("Recent sightings"),
    `${dashboard.status}`,
  );
  check(
    "dashboard includes a seeded fleet number",
    !fleetLabel || dashboard.text.includes(fleetLabel),
    fleetLabel,
  );

  const sightingsPage = await page("/sightings");
  check(
    "sightings log renders",
    sightingsPage.status === 200 && sightingsPage.text.includes("Sightings"),
    `${sightingsPage.status}`,
  );

  const sightingsGallery = await page("/sightings?view=gallery");
  check("sightings gallery view renders", sightingsGallery.status === 200);

  const fleet = await page("/fleet");
  check(
    "fleet database renders",
    fleet.status === 200 &&
      fleet.text.includes("Fleet database") &&
      (!vehicle.model || fleet.text.includes(vehicle.model)),
    `${fleet.status}`,
  );

  const fleetGrid = await page("/fleet?view=grid");
  check("fleet grid view renders", fleetGrid.status === 200);

  const newVehicle = await page("/fleet/new");
  check("new vehicle form renders", newVehicle.status === 200);

  const vehicleDetail = await page(`/fleet/${vehicle.id}`);
  check(
    "vehicle detail renders its archive",
    vehicleDetail.status === 200 &&
      vehicleDetail.text.includes("Sighting chronology") &&
      vehicleDetail.text.includes("Status history"),
    `${vehicleDetail.status}`,
  );

  const vehicleEdit = await page(`/fleet/${vehicle.id}/edit`);
  check("vehicle edit form renders", vehicleEdit.status === 200);

  const sightingDetail = await page(`/sightings/${sighting.id}`);
  check(
    "sighting detail renders photographs and details",
    sightingDetail.status === 200 &&
      sightingDetail.text.includes("Sighting details") &&
      sightingDetail.text.includes("Camera settings"),
    `${sightingDetail.status}`,
  );

  const sightingEdit = await page(`/sightings/${sighting.id}/edit`);
  check("sighting edit form renders", sightingEdit.status === 200);

  const newSighting = await page("/sightings/new");
  check(
    "new sighting form renders",
    newSighting.status === 200 &&
      newSighting.text.includes("Record a sighting") &&
      newSighting.text.includes("Map position"),
  );

  const map = await page("/map");
  check(
    "map page renders",
    map.status === 200 && map.text.includes("Spotting map"),
    `${map.status}`,
  );

  const gallery = await page("/gallery");
  check(
    "photo gallery renders",
    gallery.status === 200 && gallery.text.includes("Photo gallery"),
    `${gallery.status}`,
  );

  const stats = await page("/stats");
  check(
    "statistics render from real records",
    stats.status === 200 &&
      stats.text.includes("Fleet coverage") &&
      stats.text.includes("By operator"),
    `${stats.status}`,
  );

  const operators = await page("/operators");
  check(
    "operators management renders",
    operators.status === 200 && operators.text.includes("Operators"),
    `${operators.status}`,
  );

  const settings = await page("/settings");
  check(
    "settings and exports render",
    settings.status === 200 && settings.text.includes("Export your archive"),
    `${settings.status}`,
  );

  const missing = await page("/sightings/00000000-0000-4000-8000-000000000000");
  check(
    "missing records are handled without crashing",
    missing.status === 404 || missing.text.includes("not in your archive"),
    `${missing.status}`,
  );
}

// --------------------------------------------------------------------- api
if (vehicle.fleet_number) {
  const search = await page(`/api/search?q=${encodeURIComponent(vehicle.fleet_number)}`);
  let payload = null;
  try {
    payload = JSON.parse(search.text);
  } catch {
    // handled by the assertion
  }
  check(
    "global search finds the fleet number",
    search.status === 200 &&
      payload?.vehicles?.some((entry) => entry.fleet_number === vehicle.fleet_number),
    `${search.status}`,
  );
}

{
  const anonSearch = await page("/api/search?q=1204", { withCookie: false });
  check("search requires authentication", anonSearch.status === 401);

  const csv = await page("/api/export/vehicles.csv");
  check(
    "vehicle CSV export is generated",
    csv.status === 200 &&
      (csv.headers.get("content-type") ?? "").includes("text/csv") &&
      csv.text.includes("fleet_number"),
    `${csv.status}`,
  );

  const sightingsCsv = await page("/api/export/sightings.csv");
  check(
    "sighting CSV export is generated",
    sightingsCsv.status === 200 && sightingsCsv.text.includes("spotted_at"),
    `${sightingsCsv.status}`,
  );

  const json = await page("/api/export/data.json");
  let archive = null;
  try {
    archive = JSON.parse(json.text);
  } catch {
    // handled by the assertion
  }
  check(
    "JSON export includes structured records and excludes binaries",
    json.status === 200 &&
      archive?.includes_binary_files === false &&
      archive?.counts?.vehicles > 0,
    `${json.status}`,
  );

  if (photos.length > 0) {
    const download = await page(`/api/photos/${photos[0].id}/download`, {
      redirect: "manual",
    });
    check(
      "photo download redirects to a signed private URL",
      download.status === 307 &&
        (download.headers.get("location") ?? "").includes("/storage/v1/object/sign/"),
      `${download.status}`,
    );

    const zipResponse = await fetch(`${base}/api/export/photos.zip`, {
      headers: { cookie },
    });
    const zip = Buffer.from(await zipResponse.arrayBuffer());
    check(
      "photo archive ZIP streams a valid archive",
      zipResponse.status === 200 && zip.subarray(0, 2).toString() === "PK",
      `${zipResponse.status} ${zip.length} bytes`,
    );
  }
}

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length > 0) {
  console.error("Failed checks:");
  for (const item of failed) console.error(` - ${item.name}: ${item.detail}`);
  process.exit(1);
}
