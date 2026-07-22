import { IdentityConflictError } from "@aomi-labs/account/account";
import { WidgetAuthError } from "@aomi-labs/account/widget-auth";
import { applyWidgetCors } from "./cors";
import { PortalPrincipalError } from "./principal";
import { requirePortalPrincipal } from "./principal";

export async function portalRoutePrincipal(
  request: Request,
): Promise<
  | { principal: Awaited<ReturnType<typeof requirePortalPrincipal>> }
  | { response: Response }
> {
  try {
    return { principal: await requirePortalPrincipal(request) };
  } catch (error) {
    return { response: widgetAuthErrorResponse(request, error, "principal") };
  }
}

export function widgetAuthErrorResponse(
  request: Request,
  error: unknown,
  operation: string,
): Response {
  if (
    error instanceof WidgetAuthError ||
    error instanceof PortalPrincipalError
  ) {
    return applyWidgetCors(
      request,
      Response.json({ error: error.code }, { status: error.status }),
    );
  }
  if (error instanceof IdentityConflictError) {
    return applyWidgetCors(
      request,
      Response.json({ error: error.code }, { status: 409 }),
    );
  }
  console.error(`widget auth ${operation} failed`, error);
  return applyWidgetCors(
    request,
    Response.json({ error: "widget_auth_failed" }, { status: 500 }),
  );
}
