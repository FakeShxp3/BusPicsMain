import { firstParam } from "@/lib/utils";

export type SearchParams = Record<string, string | string[] | undefined>;

export function readString(
  params: SearchParams,
  key: string,
  maxLength = 200,
): string {
  return (firstParam(params[key]) ?? "").trim().slice(0, maxLength);
}

export function readPage(params: SearchParams): number {
  const parsed = Number.parseInt(readString(params, "page", 10), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function readPageSize(
  params: SearchParams,
  fallback: number,
  allowed: number[],
): number {
  const parsed = Number.parseInt(readString(params, "per_page", 10), 10);
  return allowed.includes(parsed) ? parsed : fallback;
}

/** Normalises a date or datetime filter to an ISO instant. */
export function readIsoParam(
  params: SearchParams,
  key: string,
  endOfDay = false,
): string | null {
  const raw = readString(params, key, 40);
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const suffix = endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z";
    const date = new Date(`${raw}${suffix}`);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function readBoolean(params: SearchParams, key: string): boolean {
  return ["1", "true", "yes", "on"].includes(readString(params, key, 10).toLowerCase());
}

export function paginationParams(
  values: Record<string, string | number | boolean | null | undefined>,
): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === "" || value === false || value === "false") {
      continue;
    }
    result[key] = String(value);
  }
  return result;
}

/**
 * PostgREST caps responses (1000 rows on Supabase). This helper walks pages so
 * aggregate queries see every record without loading the whole table at once.
 */
export async function fetchAllPages<T>(
  fetchPage: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 1000,
  maxRows = 50000,
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;
  while (from < maxRows) {
    const to = Math.min(from + pageSize - 1, maxRows - 1);
    const { data, error } = await fetchPage(from, to);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

/** Inclusive percentage between 0 and 100, rounded. */
export function sharePercent(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}
