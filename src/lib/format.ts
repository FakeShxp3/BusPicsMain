import type { DateStyle, TimeFormat, Units } from "@/lib/db/database.types";

export const TIME_ZONE_COOKIE = "ts_tz";
export const THEME_COOKIE = "ts_theme";
export const DEFAULT_TIME_ZONE = "UTC";

const DATE_STYLE_OPTIONS: Record<DateStyle, Intl.DateTimeFormatOptions["dateStyle"]> = {
  medium: "medium",
  short: "short",
  iso: "short",
  long: "long",
};

export function resolveTimeZone(value: string | null | undefined): string {
  if (!value) return DEFAULT_TIME_ZONE;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: value }).format(new Date());
    return value;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

export function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function formatter(
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
  locale = "en-CA",
): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(locale, { timeZone, ...options });
}

function ensureDate(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Date-only values are calendar dates, so they are formatted in UTC without shifting. */
export function formatDateOnly(
  dateString: string | null | undefined,
  dateStyle: DateStyle = "medium",
): string {
  if (!dateString) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateString);
  if (!match) return dateString;
  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return dateString;
  return formatter("UTC", { dateStyle: DATE_STYLE_OPTIONS[dateStyle] }).format(date);
}

export function formatDate(
  iso: string | null | undefined,
  dateStyle: DateStyle = "medium",
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  if (!iso) return "—";
  const date = ensureDate(iso);
  if (!date) return iso;
  return formatter(timeZone, { dateStyle: DATE_STYLE_OPTIONS[dateStyle] }).format(date);
}

export function formatTime(
  iso: string | null | undefined,
  timeFormat: TimeFormat = "12h",
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  if (!iso) return "—";
  const date = ensureDate(iso);
  if (!date) return iso;
  return formatter(timeZone, {
    hour: "numeric",
    minute: "2-digit",
    hour12: timeFormat === "12h",
  }).format(date);
}

export function formatDateTime(
  iso: string | null | undefined,
  dateStyle: DateStyle = "medium",
  timeFormat: TimeFormat = "12h",
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  if (!iso) return "—";
  return `${formatDate(iso, dateStyle, timeZone)} · ${formatTime(iso, timeFormat, timeZone)}`;
}

export function formatDateRange(
  fromIso: string | null | undefined,
  toIso: string | null | undefined,
  dateStyle: DateStyle = "medium",
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  if (!fromIso && !toIso) return "All time";
  if (fromIso && !toIso) return `Since ${formatDate(fromIso, dateStyle, timeZone)}`;
  if (!fromIso && toIso) return `Until ${formatDate(toIso, dateStyle, timeZone)}`;
  return `${formatDate(fromIso, dateStyle, timeZone)} – ${formatDate(toIso, dateStyle, timeZone)}`;
}

export function formatIsoDay(
  iso: string | Date,
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  const date = ensureDate(iso);
  if (!date) return "";
  return formatter(timeZone, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatMonthKey(
  iso: string | Date,
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  const date = ensureDate(iso);
  if (!date) return "";
  const parts = formatter(timeZone, {
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  return `${year}-${month}`;
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  if (!year || !month) return monthKey;
  const date = new Date(`${year}-${month}-01T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return monthKey;
  return formatter(
    "UTC",
    { month: "short", year: "numeric" },
    "en-CA",
  ).format(date);
}

/** The current month and the preceding `count - 1` months, oldest first. */
export function lastMonthKeys(count: number, timeZone: string): string[] {
  const current = formatMonthKey(new Date(), timeZone);
  const [year, month] = current.split("-").map(Number);
  if (!year || !month) return [];
  const keys: string[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(year, month - 1 - offset, 1));
    keys.push(
      `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
    );
  }
  return keys;
}

/** Inclusive month keys between two `YYYY-MM` values, capped for safety. */
export function monthRange(
  startKey: string,
  endKey: string,
  maxMonths = 120,
): string[] {
  const [startYear, startMonth] = startKey.split("-").map(Number);
  const [endYear, endMonth] = endKey.split("-").map(Number);
  if (!startYear || !startMonth || !endYear || !endMonth) return [];
  const start = Date.UTC(startYear, startMonth - 1, 1);
  const end = Date.UTC(endYear, endMonth - 1, 1);
  if (end < start) return [];

  const keys: string[] = [];
  let cursor = start;
  while (cursor <= end && keys.length < maxMonths) {
    const date = new Date(cursor);
    keys.push(
      `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
    );
    cursor = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
  }
  return keys;
}

export function formatMonthShort(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  if (!year || !month) return monthKey;
  const date = new Date(`${year}-${month}-01T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return monthKey;
  return formatter("UTC", { month: "short" }).format(date);
}

export function formatNumber(value: number, locale = "en-CA"): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-CA", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPercent(value: number, total: number): string {
  if (total <= 0) return "0%";
  const ratio = value / total;
  return new Intl.NumberFormat("en-CA", {
    style: "percent",
    maximumFractionDigits: ratio < 0.1 ? 1 : 0,
  }).format(ratio);
}

export function formatLength(metres: number | null | undefined, units: Units = "metric"): string {
  if (metres === null || metres === undefined || Number.isNaN(metres)) return "—";
  if (units === "imperial") {
    const totalInches = metres * 39.3700787;
    let feet = Math.floor(totalInches / 12);
    let inches = Math.round(totalInches - feet * 12);
    if (inches === 12) {
      feet += 1;
      inches = 0;
    }
    return `${feet} ft ${inches} in`;
  }
  const rounded = Math.round(metres * 10) / 10;
  return `${rounded.toFixed(1).replace(/\.0$/, "")} m`;
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Format an ISO instant into the `datetime-local` value the browser expects. */
export function isoToDateTimeLocal(iso: string): string {
  const date = ensureDate(iso);
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Convert a `datetime-local` value (browser local time) to an ISO instant. */
export function dateTimeLocalToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function nowDateTimeLocal(): string {
  return isoToDateTimeLocal(new Date().toISOString());
}

/** ISO boundaries for a local calendar date, used by date-range filters. */
export function startOfLocalDayIso(dateString: string): string | null {
  if (!dateString) return null;
  const date = new Date(`${dateString}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function endOfLocalDayIso(dateString: string): string | null {
  if (!dateString) return null;
  const date = new Date(`${dateString}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function isoDatePart(iso: string): string {
  return iso.slice(0, 10);
}

export function formatYearRange(
  modelYear: number | null | undefined,
  inServiceYear: number | null | undefined,
): string {
  if (modelYear && inServiceYear && modelYear !== inServiceYear) {
    return `${modelYear} · in service ${inServiceYear}`;
  }
  if (modelYear) return String(modelYear);
  if (inServiceYear) return `In service ${inServiceYear}`;
  return "—";
}
