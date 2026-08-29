import { getOrCreateAomiUserForBetterAuthSession } from "@aomi-labs/account/account";
import { auth } from "@aomi-labs/account/better-auth";
import {
  issueWidgetSession,
  requireWidgetOrigin,
} from "@aomi-labs/account/widget-auth";
import { widgetAuthRateLimit } from "@portal/lib/widget-auth/rate-limit";
import {
  widgetPreflight,
  widgetRoute,
  widgetSessionResponse,
} from "@portal/lib/widget-auth/response";

export const POST = widgetRoute(async (request: Request) => {
  const limited = widgetAuthRateLimit(request);
  if (limited) return limited;
  const origin = requireWidgetOrigin(request);
  const anonymous = await auth.api.signInAnonymous({
    headers: request.headers,
  });
  const user = await getOrCreateAomiUserForBetterAuthSession({
    betterAuthUserId: anonymous.user.id,
    email: anonymous.user.email,
    emailVerified: anonymous.user.emailVerified,
    name: anonymous.user.name,
    avatarUrl: anonymous.user.image,
  });
  const session = await issueWidgetSession({
    userId: user.id,
    origin,
    authMethod: "anonymous",
  });
  return widgetSessionResponse(session);
}, "widget.guest");

export const OPTIONS = widgetPreflight(["POST", "OPTIONS"]);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
