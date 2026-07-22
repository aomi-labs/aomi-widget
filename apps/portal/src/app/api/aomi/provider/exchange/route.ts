import {
  attachVerifiedProviderIdentityToUser,
  exchangeProviderForExistingSession,
} from "@aomi-labs/account/account";
import type { AomiAccountCredential } from "@aomi-labs/account";
import {
  getWidgetProvider,
  widgetCredentialWireSchema,
} from "@aomi-labs/account/providers";
import { json } from "@portal/lib/aomi-account/session";
import {
  accountResponseForPrincipal,
  requirePortalPrincipal,
} from "@portal/lib/widget-auth/principal";
import {
  applyWidgetCors,
  widgetCorsPreflight,
} from "@portal/lib/widget-auth/cors";
import { widgetAuthErrorResponse } from "@portal/lib/widget-auth/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  try {
    const principal = await requirePortalPrincipal(req);
    const body = (await req.json().catch(() => null)) as
      | AomiAccountCredential
      | Record<string, unknown>
      | null;
    if (!body)
      return applyWidgetCors(req, json(400, { error: "invalid_json" }));
    if (principal.kind === "widget") {
      const wire = widgetCredentialWireSchema.parse(body);
      const descriptor = getWidgetProvider(wire.provider);
      if (!descriptor || !descriptor.policy.widgetEnabled) {
        return applyWidgetCors(
          req,
          json(400, {
            error: descriptor ? "provider_not_enabled" : "unknown_provider",
          }),
        );
      }
      const credential = descriptor.credentialSchema.parse(wire);
      const identity = await descriptor.verifyWidgetCredential({
        environment: credential.environment,
        providerToken: credential.provider_token,
        keyId: credential.key_id,
      });
      await attachVerifiedProviderIdentityToUser({
        userId: principal.userId,
        identity,
        policy: descriptor.policy,
      });
      return applyWidgetCors(
        req,
        Response.json({
          status: "linked",
          account: await accountResponseForPrincipal(req, principal),
        }),
      );
    }
    const result = await exchangeProviderForExistingSession({
      betterAuthUserId: principal.betterAuthUserId,
      credential: body as AomiAccountCredential,
    });
    if (result.status === "conflict") {
      return applyWidgetCors(
        req,
        json(409, {
          ...result,
          error: "already_linked_to_another_account",
        }),
      );
    }
    return applyWidgetCors(req, Response.json(result));
  } catch (error) {
    return widgetAuthErrorResponse(req, error, "provider link");
  }
}

export function OPTIONS(request: Request): Response {
  return widgetCorsPreflight(request, ["POST", "OPTIONS"]);
}
