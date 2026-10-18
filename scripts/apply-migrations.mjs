#!/usr/bin/env node
/**
 * Apply the SQL files in supabase/migrations, in filename order, to a Supabase
 * project using the Management API.
 *
 * Required environment variables:
 *   SUPABASE_ACCESS_TOKEN   Personal access token (sbp_...) from
 *                           https://supabase.com/dashboard/account/tokens
 * Optional:
 *   SUPABASE_PROJECT_REF    Project ref; defaults to the subdomain of
 *                           NEXT_PUBLIC_SUPABASE_URL.
 *
 * This is a convenience for environments without the Supabase CLI or direct
 * Postgres access. You can equally run the SQL files in the dashboard editor.
 */
import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

async function loadEnvLocal() {
  try {
    const raw = await readFile(join(root, ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (!match) continue;
      const [, key, value] = match;
      if (process.env[key] === undefined) {
        process.env[key] = value.replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // .env.local is optional when the variables are exported by the shell.
  }
}

function projectRef() {
  if (process.env.SUPABASE_PROJECT_REF) return process.env.SUPABASE_PROJECT_REF;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_PROJECT_REF");
  return new URL(url).hostname.split(".")[0];
}

async function runSql(token, ref, sql, label) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`${label} failed (${response.status}): ${body}`);
  }
  return body;
}

await loadEnvLocal();

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN. See the script header for details.");
  process.exit(1);
}

const ref = projectRef();
const dir = join(root, "supabase", "migrations");
const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

if (files.length === 0) {
  console.error(`No .sql files found in ${dir}`);
  process.exit(1);
}

console.log(`Applying ${files.length} migration(s) to project ${ref}`);
for (const file of files) {
  const sql = await readFile(join(dir, file), "utf8");
  process.stdout.write(`  -> ${file} ... `);
  await runSql(token, ref, sql, file);
  console.log("ok");
}

// PostgREST caches the schema; ask it to reload so new tables/views appear.
await runSql(token, ref, "notify pgrst, 'reload schema';", "schema reload");
console.log("Done.");
