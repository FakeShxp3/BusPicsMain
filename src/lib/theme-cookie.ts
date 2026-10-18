import { THEME_COOKIE } from "@/lib/format";

/**
 * Persists the chosen theme in a cookie so the server-rendered document uses
 * the right theme before hydration. Kept outside components so React's
 * compiler purity rules stay happy.
 */
export function writeThemeCookie(theme: "light" | "dark" | "system"): void {
  if (typeof document === "undefined") return;
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
}
