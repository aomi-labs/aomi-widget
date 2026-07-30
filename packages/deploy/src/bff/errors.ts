// =============================================================================
// Launch source identification.
//
// This module owns only facts that require deploy-domain types. Telemetry
// classification and delivery belong to @aomi-labs/bff-observability.
// =============================================================================

import { BackendError, DeployError } from "../errors";

export type LaunchFailureSource = {
  origin: "expected" | "local" | "upstream_request" | "upstream_response";
  error: unknown;
  upstream?: "github" | "rust";
  upstreamStatus?: number;
  credential?: "service";
  response: { status: number; error: string };
};

/** Layer 1: identify a deploy-domain error without choosing a telemetry route. */
export function identifyLaunchError(error: unknown): LaunchFailureSource {
  const requiredSecretsError = asRequiredSecretsCheckError(error);
  if (requiredSecretsError) {
    const common = {
      error: requiredSecretsError.cause ?? error,
      response: { status: 503, error: "upstream_unavailable" },
    } as const;
    if (
      requiredSecretsError.upstream &&
      requiredSecretsError.upstreamStatus !== undefined
    ) {
      return {
        ...common,
        origin: "upstream_response",
        upstream: requiredSecretsError.upstream,
        upstreamStatus: requiredSecretsError.upstreamStatus,
        credential: "service",
      };
    }
    if (requiredSecretsError.upstream) {
      return {
        ...common,
        origin: "upstream_request",
        upstream: requiredSecretsError.upstream,
      };
    }
    return { ...common, origin: "local" };
  }

  const backendError = asBackendError(error);
  if (backendError) {
    const common = {
      error: backendError.cause ?? error,
      upstream: "rust" as const,
    };
    if (backendError.status === 0) {
      return {
        ...common,
        origin: "upstream_request",
        response: { status: 502, error: "upstream_unavailable" },
      };
    }
    return {
      ...common,
      origin: "upstream_response",
      upstreamStatus: backendError.status,
      credential: "service",
      response: backendResponse(backendError),
    };
  }

  if (isDeployError(error, "INVALID_REQUEST")) {
    return {
      origin: "expected",
      error,
      response: {
        status: 400,
        error: activationErrorMessage(error) ?? error.message,
      },
    };
  }

  return {
    origin: "local",
    error,
    response: { status: 500, error: "internal_error" },
  };
}

/** Default response adapter for the deploy package's framework-neutral routes. */
export function launchErrorResponse(error: unknown): Response {
  const failure = identifyLaunchError(error);
  return Response.json(
    { error: failure.response.error },
    { status: failure.response.status },
  );
}

type BackendErrorLike = {
  status: number;
  message: string;
  body?: string;
  cause?: unknown;
  reason?: unknown;
};

type RequiredSecretsCheckErrorLike = {
  cause?: unknown;
  upstream?: "github" | "rust";
  upstreamStatus?: number;
};

function asRequiredSecretsCheckError(
  error: unknown,
): RequiredSecretsCheckErrorLike | null {
  if (!error || typeof error !== "object") return null;
  const candidate = error as RequiredSecretsCheckErrorLike & { code?: unknown };
  return candidate.code === "REQUIRED_SECRETS_CHECK_UNAVAILABLE"
    ? candidate
    : null;
}

function asBackendError(error: unknown): BackendErrorLike | null {
  if (error instanceof BackendError) return error;
  if (!error || typeof error !== "object") return null;
  const candidate = error as Partial<BackendErrorLike> & { code?: unknown };
  return (candidate.code === "BACKEND" || candidate.code === "ACTIVATION") &&
    typeof candidate.status === "number" &&
    typeof candidate.message === "string"
    ? (candidate as BackendErrorLike)
    : null;
}

function isDeployError(
  error: unknown,
  code: DeployError["code"],
): error is DeployError {
  return (
    (error instanceof DeployError ||
      (typeof error === "object" && error !== null && "code" in error)) &&
    (error as { code?: unknown }).code === code
  );
}

function backendResponse(
  error: BackendErrorLike,
): LaunchFailureSource["response"] {
  if (error.status === 401 || error.status === 403) {
    return { status: 500, error: "internal_error" };
  }
  if (error.status >= 500 && error.status <= 599) {
    return { status: error.status, error: "upstream_unavailable" };
  }
  if (error.status >= 400 && error.status <= 499) {
    return {
      status: error.status,
      error:
        backendErrorMessage(error.body) ??
        activationErrorMessage(error) ??
        error.message,
    };
  }
  return { status: 502, error: "upstream_unavailable" };
}

function backendErrorMessage(body?: string): string | null {
  if (!body) return null;
  try {
    const json = JSON.parse(body) as { error?: unknown };
    return typeof json.error === "string" ? json.error : null;
  } catch {
    return null;
  }
}

function activationErrorMessage(error: unknown): string | null {
  const reason =
    error && typeof error === "object" && "reason" in error
      ? error.reason
      : undefined;
  if (!Array.isArray(reason)) {
    return null;
  }
  const first = reason.find(
    (reason): reason is { error: string } =>
      typeof reason === "object" &&
      reason !== null &&
      "error" in reason &&
      typeof reason.error === "string",
  );
  return first?.error ?? null;
}
