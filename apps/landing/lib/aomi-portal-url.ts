type LandingPortalEnv = Record<string, string | undefined>;

const LOCAL_PORTAL_URL = "http://localhost:3000";
const PRODUCTION_PORTAL_URL = "https://chat.aomi.dev";
const LANDING_PREVIEW_PREFIX = "landing-page-";
const PORTAL_PREVIEW_PREFIX = "chat-portal-";
const AOMI_VERCEL_SUFFIX = "-aomi-labs.vercel.app";

export function resolveLandingAomiPortalUrl(
  env: LandingPortalEnv = process.env,
): string {
  const explicit = normalizeUrl(env.NEXT_PUBLIC_AOMI_PORTAL_URL);
  if (explicit) return explicit;

  if (env.VERCEL_ENV === "preview") {
    const preview = matchingPortalPreviewUrl(env.VERCEL_BRANCH_URL);
    if (preview) return preview;
  }

  return env.NODE_ENV === "development"
    ? LOCAL_PORTAL_URL
    : PRODUCTION_PORTAL_URL;
}

function matchingPortalPreviewUrl(
  landingBranchUrl: string | undefined,
): string | null {
  const landingUrl = normalizeUrl(landingBranchUrl);
  if (!landingUrl) return null;
  const parsed = new URL(landingUrl);
  if (
    parsed.protocol !== "https:" ||
    !parsed.hostname.startsWith(LANDING_PREVIEW_PREFIX) ||
    !parsed.hostname.endsWith(AOMI_VERCEL_SUFFIX)
  ) {
    return null;
  }
  parsed.hostname = `${PORTAL_PREVIEW_PREFIX}${parsed.hostname.slice(
    LANDING_PREVIEW_PREFIX.length,
  )}`;
  return parsed.origin;
}

function normalizeUrl(value: string | undefined): string | null {
  const trimmed = value?.trim().replace(/\/+$/, "");
  if (!trimmed) return null;
  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    return new URL(withProtocol).origin;
  } catch {
    return null;
  }
}
