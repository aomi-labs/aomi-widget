const STORAGE_KEY = "aomi-build-recent-rail-open";

/** xl breakpoint — matches Tailwind `xl:` used elsewhere on Create. */
const XL_MEDIA = "(min-width: 1280px)";

/**
 * Read persisted Recent-rail preference.
 * `null` = never toggled; caller should use viewport default.
 */
export function readRecentRailPreference(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "1") return true;
    if (raw === "0") return false;
  } catch {
    // ignore quota / private mode
  }
  return null;
}

export function writeRecentRailPreference(open: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
  } catch {
    // ignore quota / private mode
  }
}

/** First-visit default: open on xl+, closed below. */
export function defaultRecentRailOpen(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(XL_MEDIA).matches;
}

export function getInitialRecentRailOpen(): boolean {
  const stored = readRecentRailPreference();
  if (stored !== null) return stored;
  return defaultRecentRailOpen();
}
