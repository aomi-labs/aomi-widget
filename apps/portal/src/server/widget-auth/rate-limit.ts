import { isIP } from "node:net";
import {
  checkWidgetAuthRateLimit,
  observedWidgetOrigin,
} from "@aomi-labs/account/widget-auth";

/**
 * Vercel overwrites this header at its public edge, unlike a caller-provided
 * forwarding chain. Local development may use x-real-ip; absent a verified
 * address all callers deliberately share a conservative fallback bucket.
 */
export function widgetClientAddress(
  request: Request,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const raw = env.VERCEL
    ? request.headers.get("x-vercel-forwarded-for")
    : request.headers.get("x-real-ip");
  const address = raw?.trim() ?? "";
  return isIP(address) ? address : "unknown";
}

/** Shared per-origin, per-client fixed-window quota for public widget-auth
 * endpoints. The account package stores only a digest in ba_verifications. */
export async function widgetAuthRateLimit(
  request: Request,
): Promise<Response | null> {
  const result = await checkWidgetAuthRateLimit({
    origin: observedWidgetOrigin(request) ?? "invalid",
    clientAddress: widgetClientAddress(request),
  });
  if (result.allowed) return null;
  return Response.json({ error: "rate_limited" }, { status: 429 });
}
