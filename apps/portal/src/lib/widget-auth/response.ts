import { IdentityConflictError } from "@aomi-labs/account/account";
import {
  WidgetAuthError,
  type WidgetSession,
} from "@aomi-labs/account/widget-auth";
import { ZodError } from "zod";
import { applyWidgetCors, widgetCorsPreflight } from "./cors";
import { PortalPrincipalError } from "./principal";

/**
 * Provider-token verification failures (para.ts / privy.ts) are thrown as plain
 * `Error`s whose message is a stable snake_case code. They are client faults
 * (a bad/expired/mismatched token), so they map to 401 with that code rather
 * than falling through to a generic 500.
 */
const PROVIDER_TOKEN_ERROR_CODES = new Set([
  "invalid_provider_token",
  "invalid_provider_token_header",
  "invalid_provider_environment",
]);

function providerTokenErrorCode(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  const message = error.message;
  if (PROVIDER_TOKEN_ERROR_CODES.has(message)) return message;
  if (/^provider_token_[a-z0-9_]+$/.test(message)) return message;
  return null;
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
  if (error instanceof ZodError) {
    return applyWidgetCors(
      request,
      Response.json({ error: "invalid_request" }, { status: 400 }),
    );
  }
  const providerTokenCode = providerTokenErrorCode(error);
  if (providerTokenCode) {
    return applyWidgetCors(
      request,
      Response.json({ error: providerTokenCode }, { status: 401 }),
    );
  }
  console.error(`widget auth ${operation} failed`, error);
  return applyWidgetCors(
    request,
    Response.json({ error: "widget_auth_failed" }, { status: 500 }),
  );
}

/**
 * Wraps a widget route handler so it can return plain `Response`s and throw
 * typed errors: the wrapper applies the cross-origin CORS headers on success
 * and maps thrown errors centrally via {@link widgetAuthErrorResponse}.
 */
export function widgetRoute<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
  operation = "widget route",
): (...args: Args) => Promise<Response> {
  return async (...args: Args): Promise<Response> => {
    const request = args[0] as Request;
    try {
      return applyWidgetCors(request, await handler(...args));
    } catch (error) {
      return widgetAuthErrorResponse(request, error, operation);
    }
  };
}

/**
 * Builds the OPTIONS/preflight handler for a widget route so routes no longer
 * hand-write `export function OPTIONS`.
 */
export function widgetPreflight(
  methods: readonly string[],
): (request: Request) => Response {
  return (request: Request): Response => widgetCorsPreflight(request, methods);
}

/** The snake_case widget session envelope returned by all issuing routes. */
export function widgetSessionResponse(session: WidgetSession): Response {
  return Response.json({
    access_token: session.token,
    token_type: session.tokenType,
    expires_at: session.expiresAt,
    user: { id: session.userId },
  });
}

type WidgetChallenge = {
  nonce: string;
  domain: string;
  uri: string;
  issuedAt: string;
  expirationTime: string;
};

/** The snake_case challenge envelope returned by the SIWE/SIWS nonce routes. */
export function widgetChallengeResponse(challenge: WidgetChallenge): Response {
  return Response.json({
    nonce: challenge.nonce,
    domain: challenge.domain,
    uri: challenge.uri,
    issued_at: challenge.issuedAt,
    expiration_time: challenge.expirationTime,
  });
}
