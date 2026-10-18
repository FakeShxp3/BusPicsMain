import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateOnly,
  formatDateTime,
  formatFileSize,
  formatLength,
  formatMonthLabel,
  formatPercent,
  lastMonthKeys,
  monthRange,
  dateTimeLocalToIso,
  isoToDateTimeLocal,
} from "@/lib/format";
import {
  buildQueryString,
  getInitials,
  sanitizeSearchTerm,
  truncate,
} from "@/lib/utils";

describe("date formatting", () => {
  it("formats date-only values without shifting the calendar day", () => {
    expect(formatDateOnly("2026-10-17", "medium")).toBe("Oct 17, 2026");
    expect(formatDateOnly("2026-10-17", "short")).toBe("2026-10-17");
    expect(formatDateOnly("2026-10-17", "long")).toBe("October 17, 2026");
    expect(formatDateOnly(null)).toBe("—");
  });

  it("formats an instant in the requested time zone", () => {
    const iso = "2026-10-17T19:36:00.000Z";
    expect(formatDate(iso, "medium", "UTC")).toBe("Oct 17, 2026");
    expect(formatDateTime(iso, "medium", "24h", "UTC")).toBe("Oct 17, 2026 · 19:36");
    expect(formatDateTime(iso, "medium", "12h", "UTC")).toContain("7:36");
  });

  it("builds a chronological month range", () => {
    expect(monthRange("2025-11", "2026-02")).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
    expect(monthRange("2026-02", "2025-11")).toEqual([]);
    expect(monthRange("2025-01", "2026-12", 3)).toHaveLength(3);
  });

  it("returns the last N month keys ending with the current month", () => {
    const keys = lastMonthKeys(3, "UTC");
    expect(keys).toHaveLength(3);
    expect([...keys].sort()).toEqual(keys);
    expect(keys[keys.length - 1]).toMatch(/^\d{4}-\d{2}$/);
  });

  it("formats month labels", () => {
    expect(formatMonthLabel("2026-10")).toBe("Oct 2026");
    expect(formatMonthLabel("bad")).toBe("bad");
  });

  it("round-trips a datetime-local value", () => {
    const iso = "2026-10-17T19:36:00.000Z";
    const local = isoToDateTimeLocal(iso);
    expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(dateTimeLocalToIso(local)).toBe(iso);
  });
});

describe("measurement and number formatting", () => {
  it("formats vehicle length in metric and imperial units", () => {
    expect(formatLength(12.19, "metric")).toBe("12.2 m");
    expect(formatLength(12.19, "imperial")).toBe("40 ft 0 in");
    expect(formatLength(null)).toBe("—");
  });

  it("formats file sizes", () => {
    expect(formatFileSize(1536)).toBe("2 KB");
    expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
    expect(formatFileSize(null)).toBe("—");
  });

  it("formats percentages safely", () => {
    expect(formatPercent(1, 3)).toBe("33%");
    expect(formatPercent(5, 0)).toBe("0%");
    expect(formatPercent(2, 2)).toBe("100%");
  });
});

describe("text utilities", () => {
  it("strips PostgREST filter syntax from search terms", () => {
    expect(sanitizeSearchTerm("  foo,bar(baz)%  ")).toBe("foo bar baz");
    expect(sanitizeSearchTerm("N19")).toBe("N19");
  });

  it("builds query strings without empty values", () => {
    expect(buildQueryString({ q: "bus", page: 2, empty: "", missing: null })).toBe(
      "?q=bus&page=2",
    );
    expect(buildQueryString({})).toBe("");
  });

  it("derives initials", () => {
    expect(getInitials("Demo Spotter")).toBe("DS");
    expect(getInitials(null, "driver@example.com")).toBe("DR");
    expect(getInitials("")).toBe("?");
  });

  it("truncates long text", () => {
    expect(truncate("abcdefgh", 5)).toBe("abcd…");
    expect(truncate("abc", 5)).toBe("abc");
  });
});
