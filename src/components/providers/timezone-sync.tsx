"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { TIME_ZONE_COOKIE, isValidTimeZone } from "@/lib/format";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`));
  if (!match) return null;
  try {
    return decodeURIComponent(match.slice(name.length + 1));
  } catch {
    return null;
  }
}

/**
 * Stores the browser's IANA time zone in a cookie so server-rendered dates
 * match the viewer's local time. Refreshes once when the value changes.
 */
export function TimezoneSync({ current }: { current: string }) {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!detected || !isValidTimeZone(detected)) return;

    if (readCookie(TIME_ZONE_COOKIE) !== detected) {
      document.cookie = `${TIME_ZONE_COOKIE}=${encodeURIComponent(detected)}; path=/; max-age=31536000; samesite=lax`;
      if (current !== detected) router.refresh();
    }
  }, [current, router]);

  return null;
}
