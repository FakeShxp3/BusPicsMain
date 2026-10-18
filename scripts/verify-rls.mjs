#!/usr/bin/env node
/**
 * Live Row Level Security / Storage isolation check.
 *
 * Creates two authenticated sessions and proves that user B cannot read,
 * update, delete or attach records to user A's data, that anonymous access is
 * rejected, and that the storage bucket enforces ownership and MIME limits.
 *
 * Required environment variables (or entries in .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   TEST_USER_A_EMAIL / TEST_USER_A_PASSWORD
 *   TEST_USER_B_EMAIL / TEST_USER_B_PASSWORD
 *
 * The two accounts must already exist and be email-confirmed.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

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
const bucket = process.env.NEXT_PUBLIC_SUPABASE_PHOTO_BUCKET || "transitspotter-photos";

const credentials = {
  a: { email: process.env.TEST_USER_A_EMAIL, password: process.env.TEST_USER_A_PASSWORD },
  b: { email: process.env.TEST_USER_B_EMAIL, password: process.env.TEST_USER_B_PASSWORD },
};

if (!url || !anonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}
if (!credentials.a.email || !credentials.b.email) {
  console.error("Missing TEST_USER_A_EMAIL / TEST_USER_B_EMAIL (and passwords)");
  process.exit(1);
}

const results = [];
function check(name, passed, detail = "") {
  results.push({ name, passed, detail });
  console.log(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

function client() {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    db: { schema: "transitspotter" },
  });
}

async function signIn(creds) {
  const supabase = client();
  const { data, error } = await supabase.auth.signInWithPassword(creds);
  if (error) throw new Error(`Sign-in failed for ${creds.email}: ${error.message}`);
  return { supabase, user: data.user };
}

const runId = Date.now().toString(36);
const created = { operatorId: null, vehicleId: null, sightingId: null, storagePath: null };

const a = await signIn(credentials.a);
const b = await signIn(credentials.b);

check("sessions are distinct", a.user.id !== b.user.id);

// ---------------------------------------------------------------- A creates
{
  const { data, error } = await a.supabase
    .from("operators")
    .insert({ user_id: a.user.id, name: `Verification Operator ${runId}` })
    .select("id")
    .single();
  check("user A can insert an operator", !error && !!data?.id, error?.message);
  created.operatorId = data?.id ?? null;
}

{
  const { data, error } = await a.supabase
    .from("vehicles")
    .insert({
      user_id: a.user.id,
      operator_id: created.operatorId,
      fleet_number: `V-${runId}`,
      manufacturer: "Verification Motors",
      model: "RLS 1000",
      status: "active",
    })
    .select("id")
    .single();
  check("user A can insert a vehicle", !error && !!data?.id, error?.message);
  created.vehicleId = data?.id ?? null;
}

{
  const { data, error } = await a.supabase
    .from("sightings")
    .insert({
      user_id: a.user.id,
      vehicle_id: created.vehicleId,
      spotted_at: new Date().toISOString(),
      route: `R${runId}`,
      latitude: 49.2827,
      longitude: -123.1207,
      location_name: "Verification Bay",
    })
    .select("id")
    .single();
  check("user A can insert a sighting", !error && !!data?.id, error?.message);
  created.sightingId = data?.id ?? null;
}

// ------------------------------------------------------------- A can read
{
  const { data, error } = await a.supabase
    .from("sighting_overview")
    .select("id, fleet_number, operator_name, photo_count")
    .eq("id", created.sightingId);
  check(
    "sighting_overview respects RLS and joins operator data",
    !error && data?.length === 1 && data[0].operator_name?.startsWith("Verification Operator"),
    error?.message,
  );
}

// ------------------------------------------------------ B cannot read/write
{
  const { data, error } = await b.supabase
    .from("operators")
    .select("id")
    .eq("id", created.operatorId);
  check("user B cannot read user A's operator", !error && data?.length === 0, error?.message);
}

{
  const { data, error } = await b.supabase
    .from("vehicles")
    .select("id")
    .in("id", [created.vehicleId]);
  check("user B cannot read user A's vehicle", !error && data?.length === 0, error?.message);
}

{
  const { data, error } = await b.supabase
    .from("sightings")
    .select("id")
    .eq("id", created.sightingId);
  check("user B cannot read user A's sighting", !error && data?.length === 0, error?.message);
}

{
  const { data, error } = await b.supabase
    .from("vehicles")
    .update({ fleet_number: "HACKED" })
    .eq("id", created.vehicleId)
    .select("id");
  check("user B cannot update user A's vehicle", !error && data?.length === 0, error?.message);
}

{
  const { data, error } = await b.supabase
    .from("vehicles")
    .delete()
    .eq("id", created.vehicleId)
    .select("id");
  check("user B cannot delete user A's vehicle", !error && data?.length === 0, error?.message);
}

{
  const { error } = await b.supabase.from("vehicles").insert({
    user_id: b.user.id,
    operator_id: created.operatorId,
    fleet_number: "ATTACH",
  });
  check("user B cannot attach a vehicle to user A's operator", !!error, error?.message);
}

{
  const { error } = await b.supabase.from("photos").insert({
    user_id: b.user.id,
    sighting_id: created.sightingId,
    storage_path: `${b.user.id}/${created.sightingId}/attack.png`,
    original_filename: "attack.png",
    mime_type: "image/png",
  });
  check("user B cannot attach a photo to user A's sighting", !!error, error?.message);
}

// ------------------------------------------------------------- anon access
{
  const anon = client();
  const { data, error } = await anon.from("operators").select("id").limit(1);
  check(
    "anonymous callers cannot read operators",
    (error && /permission|denied|JWT/i.test(error.message)) || data?.length === 0,
    error?.message ?? `${data?.length ?? 0} rows`,
  );
  const view = await anon.from("vehicle_overview").select("id").limit(1);
  check(
    "anonymous callers cannot read the fleet view",
    (view.error && /permission|denied|JWT/i.test(view.error.message)) || view.data?.length === 0,
    view.error?.message ?? `${view.data?.length ?? 0} rows`,
  );
}

// --------------------------------------------------------- status RPC / history
{
  const { error } = await a.supabase.rpc("record_vehicle_status", {
    p_vehicle_id: created.vehicleId,
    p_status: "retired",
    p_changed_on: new Date().toISOString().slice(0, 10),
    p_notes: "Verification move",
  });
  const { data: history } = await a.supabase
    .from("vehicle_status_history")
    .select("previous_status, new_status, notes")
    .eq("vehicle_id", created.vehicleId);
  check(
    "status changes are recorded in history",
    !error && history?.length === 1 && history[0].new_status === "retired",
    error?.message,
  );
}

{
  const { error } = await b.supabase.rpc("record_vehicle_status", {
    p_vehicle_id: created.vehicleId,
    p_status: "scrapped",
  });
  check("user B cannot change user A's vehicle status", !!error, error?.message);
}

// ------------------------------------------------------------ storage rules
if (created.sightingId) {
  const path = `${a.user.id}/${created.sightingId}/${crypto.randomUUID()}.png`;
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );

  {
    const { error } = await a.supabase.storage.from(bucket).upload(path, png, {
      contentType: "image/png",
      upsert: false,
    });
    check("user A can upload a PNG to their own folder", !error, error?.message);
    created.storagePath = error ? null : path;
  }

  {
    const { error } = await b.supabase.storage.from(bucket).download(path);
    check("user B cannot download user A's object", !!error, error?.message);
  }

  {
    const { error } = await b.supabase.storage
      .from(bucket)
      .upload(`${a.user.id}/${created.sightingId}/attack.png`, png, {
        contentType: "image/png",
        upsert: false,
      });
    check("user B cannot upload into user A's folder", !!error, error?.message);
  }

  {
    const { error } = await a.supabase.storage
      .from(bucket)
      .upload(`${a.user.id}/${created.sightingId}/bad.txt`, Buffer.from("hello"), {
        contentType: "text/plain",
      });
    check("bucket rejects unsupported MIME types", !!error, error?.message);
  }

  {
    const { data, error } = await a.supabase.storage.from(bucket).createSignedUrl(path, 60);
    check("signed URLs can be created for owned objects", !error && !!data?.signedUrl, error?.message);
  }

  if (created.storagePath) {
    const { error } = await a.supabase.storage.from(bucket).remove([created.storagePath]);
    check("user A can delete their own object", !error, error?.message);
  }
}

// ------------------------------------------------------------------ cleanup
if (created.vehicleId) {
  await a.supabase.from("vehicles").delete().eq("id", created.vehicleId);
}
if (created.operatorId) {
  await a.supabase.from("operators").delete().eq("id", created.operatorId);
}

const failed = results.filter((r) => !r.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length > 0) {
  console.error("\nFailed checks:");
  for (const f of failed) console.error(` - ${f.name}: ${f.detail}`);
  process.exit(1);
}
