/**
 * The selected deployment platform.
 *
 * Partner scope travels in `?platform=`, which is correct for a page but not
 * for the shell: the sidebar, command palette, and back links are static, so
 * the first click on any of them would drop the param and silently return a
 * partner developer to Community. The selection is therefore also persisted
 * here and re-attached to the routes that understand it.
 *
 * This is deliberately not `LaunchState.platform` — that one records which
 * platform the wizard's in-flight progress belongs to, and restarting a wizard
 * should not change which platform you are browsing.
 */
const STORAGE_KEY = "aomi_build_platform";

export function readPlatform(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY)?.trim() || null;
  } catch {
    return null;
  }
}

export function writePlatform(platform: string | null) {
  if (typeof window === "undefined") return;
  try {
    const value = platform?.trim();
    if (value) window.localStorage.setItem(STORAGE_KEY, value);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be blocked or full; never let that break navigation.
  }
}

export { platformParam } from "@aomi-labs/deploy/launch";

/** Routes that understand `?platform=`. Anything else is left alone. */
function isPlatformScoped(href: string): boolean {
  return (
    href === "/projects" ||
    href === "/operate/deployments/new" ||
    href.startsWith("/projects/")
  );
}

/** Re-attach the active platform to a platform-scoped href. */
export function platformHref(
  href: string,
  platform: string | null | undefined,
): string {
  if (!platform || href.includes("?") || !isPlatformScoped(href)) return href;
  return `${href}?platform=${encodeURIComponent(platform)}`;
}
