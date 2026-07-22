import { json } from "@portal/lib/aomi-account/session";
import {
  deactivateAomiAccount,
  updateAccountProfile,
} from "@aomi-labs/account/account";
import { auth } from "@aomi-labs/account/better-auth";
import { revokeWidgetSession } from "@aomi-labs/account/widget-auth";
import {
  accountResponseForPrincipal,
  requirePortalPrincipal,
  resolvePortalPrincipal,
} from "@portal/lib/widget-auth/principal";
import {
  applyWidgetCors,
  widgetCorsPreflight,
} from "@portal/lib/widget-auth/cors";
import { widgetAuthErrorResponse } from "@portal/lib/widget-auth/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  try {
    const principal = await resolvePortalPrincipal(req);
    const body =
      principal.kind === "anonymous"
        ? { user: null, linkedAccounts: [], wallets: [], session: null }
        : await accountResponseForPrincipal(req, principal);
    return applyWidgetCors(req, Response.json(body));
  } catch (error) {
    return widgetAuthErrorResponse(req, error, "account read");
  }
}

export async function PATCH(req: Request): Promise<Response> {
  try {
    const principal = await requirePortalPrincipal(req);
    const body = (await req.json().catch(() => null)) as {
      displayName?: string | null;
      avatarUrl?: string | null;
    } | null;
    if (!body)
      return applyWidgetCors(req, json(400, { error: "invalid_json" }));
    await updateAccountProfile({
      userId: principal.userId,
      displayName: body.displayName,
      avatarUrl: body.avatarUrl,
    });
    return applyWidgetCors(
      req,
      Response.json(await accountResponseForPrincipal(req, principal)),
    );
  } catch (error) {
    return widgetAuthErrorResponse(req, error, "account update");
  }
}

export async function DELETE(req: Request): Promise<Response> {
  try {
    const principal = await requirePortalPrincipal(req);
    const result = await deactivateAomiAccount({ userId: principal.userId });
    if (result.status === "not_found") {
      return applyWidgetCors(req, json(404, { error: "account_not_found" }));
    }
    if (result.status === "last_factor") {
      return applyWidgetCors(
        req,
        json(409, { error: "cannot_delete_last_login_factor" }),
      );
    }
    if (principal.kind === "widget") {
      await revokeWidgetSession({ request: req });
      return applyWidgetCors(req, Response.json(result));
    }
    const url = new URL(req.url);
    url.pathname = "/api/auth/sign-out";
    url.search = "";
    const signOutResponse = await auth.handler(
      new Request(url, { method: "POST", headers: req.headers }),
    );
    return applyWidgetCors(
      req,
      Response.json(result, { headers: signOutResponse.headers }),
    );
  } catch (error) {
    return widgetAuthErrorResponse(req, error, "account delete");
  }
}

export function OPTIONS(req: Request): Response {
  return widgetCorsPreflight(req, ["GET", "PATCH", "DELETE", "OPTIONS"]);
}
