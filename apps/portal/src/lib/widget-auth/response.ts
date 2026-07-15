import { WidgetAuthError } from "@aomi-labs/account/widget-auth";
import { applyWidgetCors } from "./cors";

export function widgetAuthErrorResponse(
  request: Request,
  error: unknown,
  operation: string,
): Response {
  if (error instanceof WidgetAuthError) {
    return applyWidgetCors(
      request,
      Response.json({ error: error.code }, { status: error.status }),
    );
  }
  console.error(`widget auth ${operation} failed`, error);
  return applyWidgetCors(
    request,
    Response.json({ error: "widget_auth_failed" }, { status: 500 }),
  );
}
