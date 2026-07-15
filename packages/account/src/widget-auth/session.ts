import { createHash, randomBytes } from "node:crypto";
import { observedWidgetOrigin } from "./origin";
import { widgetAuthStore, type WidgetAuthStore } from "./store";

export const WIDGET_SESSION_TTL_SECONDS = 30 * 60;
const WIDGET_TOKEN_PREFIX = "aomi_wst_";
const WIDGET_SESSION_NAMESPACE = "aomi:widget:session:";

export type WidgetSession = {
  token: string;
  tokenType: "Bearer";
  expiresAt: number;
  userId: string;
};

export async function issueWidgetSession(input: {
  userId: string;
  origin: string;
  now?: Date;
  ttlSeconds?: number;
  store?: WidgetAuthStore;
}): Promise<WidgetSession> {
  const now = input.now ?? new Date();
  const ttlSeconds = input.ttlSeconds ?? WIDGET_SESSION_TTL_SECONDS;
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
  const token = `${WIDGET_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;

  await (input.store ?? widgetAuthStore).write({
    identifier: sessionIdentifier(token),
    expiresAt,
    ticket: {
      kind: "widget_session",
      userId: input.userId,
      origin: input.origin,
      issuedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    },
  });

  return {
    token,
    tokenType: "Bearer",
    expiresAt: Math.floor(expiresAt.getTime() / 1000),
    userId: input.userId,
  };
}

export async function resolveWidgetSession(input: {
  request: Request;
  now?: Date;
  store?: WidgetAuthStore;
}): Promise<{ userId: string; origin: string } | null> {
  const token = bearerToken(input.request);
  const origin = observedWidgetOrigin(input.request);
  if (!token || !origin) return null;

  const ticket = await (input.store ?? widgetAuthStore).read({
    identifier: sessionIdentifier(token),
    now: input.now ?? new Date(),
  });
  if (ticket?.kind !== "widget_session" || ticket.origin !== origin) {
    return null;
  }
  return { userId: ticket.userId, origin: ticket.origin };
}

export async function resolveWidgetCanonicalUserId(
  request: Request,
): Promise<string | null> {
  return (await resolveWidgetSession({ request }))?.userId ?? null;
}

export async function revokeWidgetSession(input: {
  request: Request;
  now?: Date;
  store?: WidgetAuthStore;
}): Promise<boolean> {
  const token = bearerToken(input.request);
  const session = await resolveWidgetSession(input);
  if (!token || !session) return false;
  return (input.store ?? widgetAuthStore).delete({
    identifier: sessionIdentifier(token),
  });
}

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization) return null;
  const [scheme, token, extra] = authorization.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer" || !token || extra) return null;
  return token.startsWith(WIDGET_TOKEN_PREFIX) ? token : null;
}

function sessionIdentifier(token: string): string {
  return `${WIDGET_SESSION_NAMESPACE}${hash(token)}`;
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
