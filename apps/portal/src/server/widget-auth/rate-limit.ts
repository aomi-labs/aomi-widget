import { isIP } from "node:net";
import {
  checkWidgetAuthRateLimit,
  observedWidgetOrigin,
} from "@aomi-labs/account/widget-auth";

/**
 * Vercel calculates x-real-ip after its verified-proxy layer, including when
 * Cloudflare fronts a custom domain. Never fall back to caller-controlled
 * forwarding headers; absent one valid address, callers share a conservative
 * bucket.
 */
export function widgetClientAddress(request: Request): string {
  const address = request.headers.get("x-real-ip")?.trim() ?? "";
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
