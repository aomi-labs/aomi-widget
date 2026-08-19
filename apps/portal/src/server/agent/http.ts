import type { AomiPublicV1 } from "@aomi-labs/client";

import { PublicCredentialError } from "./credential-ladder";
import { CursorError } from "./cursor";
import { AgentKernelError } from "./kernel";

type PublicErrorCode = AomiPublicV1["schemas"]["PublicError"]["code"];

export function idempotencyKey(request: Request): string {
  const value = request.headers.get("idempotency-key")?.trim();
  if (!value || value.length < 16 || value.length > 255) {
    throw new PublicHttpError(
      400,
      "idempotency_conflict",
      "A valid Idempotency-Key is required",
    );
  }
  return value;
}

export async function jsonBody<T>(
  request: Request,
  limit = 64 * 1024,
): Promise<T> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > limit) {
    throw new PublicHttpError(
      413,
      "payload_too_large",
      "Request body is too large",
    );
  }
  const text = await request.text();
  if (Buffer.byteLength(text) > limit) {
    throw new PublicHttpError(
      413,
      "payload_too_large",
      "Request body is too large",
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new PublicHttpError(
      400,
      "invalid_action_result",
      "Request body is not valid JSON",
    );
  }
}

export class PublicHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: PublicErrorCode,
    message: string,
    readonly retryable = false,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export function publicJson(
  body: unknown,
  status = 200,
  headers?: HeadersInit,
): Response {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      vary: "Origin, Accept",
      ...Object.fromEntries(new Headers(headers)),
    },
  });
}

export function publicFailure(error: unknown): Response {
  if (error instanceof PublicHttpError) {
    return publicJson(
      envelope(error.code, error.message, error.retryable, error.details),
      error.status,
    );
  }
  if (error instanceof PublicCredentialError) {
    const code =
      error.code === "insufficient_scope"
        ? "insufficient_scope"
        : error.code === "authentication_required"
          ? "authentication_required"
          : "invalid_auth";
    return publicJson(envelope(code, error.message, false), error.status);
  }
  if (error instanceof CursorError) {
    return publicJson(
      envelope(error.code, error.message, false, { resync: true }),
      error.code === "cursor_expired" ? 410 : 400,
    );
  }
  if (error instanceof AgentKernelError) {
    const code = kernelCode(error);
    const response = publicJson(
      envelope(code.code, code.message, code.retryable),
      code.status,
    );
    for (const name of ["payment-required", "payment-response"]) {
      const value = error.headers.get(name);
      if (value) response.headers.set(name, value);
    }
    return response;
  }
  const message = error instanceof Error ? error.message : "internal_error";
  const known: Partial<Record<string, [number, PublicErrorCode]>> = {
    application_not_found: [404, "app_not_authorized"],
    ambiguous_application_alias: [409, "app_not_authorized"],
    guest_session_expired: [410, "session_expired"],
    guest_application_forbidden: [403, "app_not_authorized"],
    guest_quota_exhausted: [429, "quota_exhausted"],
  };
  const mapped = known[message];
  return publicJson(
    envelope(
      mapped?.[1] ?? "internal_error",
      mapped ? message : "Internal error",
      !mapped,
    ),
    mapped?.[0] ?? 500,
  );
}

function kernelCode(error: AgentKernelError): {
  status: number;
  code: PublicErrorCode;
  message: string;
  retryable: boolean;
} {
  const raw = record(error.body)?.error;
  const internal =
    typeof raw === "string"
      ? raw
      : String(record(raw)?.code ?? "internal_error");
  const codes: Partial<Record<string, PublicErrorCode>> = {
    action_not_found: "action_not_found",
    revision_conflict: "action_conflict",
    idempotency_conflict: "idempotency_conflict",
    action_result_mismatch: "invalid_action_result",
    session_not_found: "session_not_found",
    application_forbidden: "app_not_authorized",
    insufficient_scope: "insufficient_scope",
  };
  return {
    status: error.status,
    code:
      error.status === 402
        ? "payment_required"
        : (codes[internal] ?? "internal_error"),
    message: internal,
    retryable: error.status >= 500,
  };
}

function envelope(
  code: PublicErrorCode,
  message: string,
  retryable: boolean,
  details?: Record<string, unknown>,
) {
  return {
    error: { code, message, retryable, ...(details ? { details } : {}) },
  };
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
