import {
  getWidgetProvider,
  widgetCredentialWireSchema,
} from "@aomi-labs/account/providers";
import { resolveVerifiedProviderIdentity } from "@aomi-labs/account/account";
import {
  issueWidgetSession,
  requireWidgetOrigin,
  WidgetAuthError,
} from "@aomi-labs/account/widget-auth";
import {
  applyWidgetCors,
  widgetCorsPreflight,
} from "@portal/lib/widget-auth/cors";
import { widgetAuthErrorResponse } from "@portal/lib/widget-auth/response";

export async function POST(request: Request): Promise<Response> {
  try {
    const origin = requireWidgetOrigin(request);
    const wire = widgetCredentialWireSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!wire.success) throw new WidgetAuthError("invalid_request", 400);
    const descriptor = getWidgetProvider(wire.data.provider);
    if (!descriptor) throw new WidgetAuthError("unknown_provider", 400);
    if (!descriptor.policy.widgetEnabled) {
      throw new WidgetAuthError("provider_not_enabled", 400);
    }
    const credential = descriptor.credentialSchema.safeParse(wire.data);
    if (!credential.success) throw new WidgetAuthError("invalid_request", 400);
    const identity = await descriptor.verifyWidgetCredential({
      environment: credential.data.environment,
      providerToken: credential.data.provider_token,
      keyId: credential.data.key_id,
    });
    const resolution = await resolveVerifiedProviderIdentity({
      identity,
      policy: descriptor.policy,
      displayName: identity.email?.value,
    });
    const session = await issueWidgetSession({
      userId: resolution.user.id,
      origin,
      authMethod: descriptor.id,
      providerIdentityId: resolution.identity.id,
    });
    return applyWidgetCors(
      request,
      Response.json({
        access_token: session.token,
        token_type: session.tokenType,
        expires_at: session.expiresAt,
        user: { id: session.userId },
      }),
    );
  } catch (error) {
    return widgetAuthErrorResponse(request, error, "provider exchange");
  }
}

export function OPTIONS(request: Request): Response {
  return widgetCorsPreflight(request, ["POST", "OPTIONS"]);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
