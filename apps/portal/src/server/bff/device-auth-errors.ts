import {
  normalizeRequestPath,
  type FailureInput,
} from "@aomi-labs/bff-observability";

type DeviceAuthFailureContext = {
  routeFamily: string;
  operation: string;
  expectedCodes?: ReadonlySet<string>;
};

export function identifyDeviceAuthFailure(
  error: unknown,
  context: DeviceAuthFailureContext,
): FailureInput {
  const failureContext = {
    routeFamily: normalizeRequestPath(context.routeFamily),
    operation: context.operation,
    method: "POST",
  };

  if (isExpectedDeviceAuthError(error, context.expectedCodes)) {
    return {
      source: "expected",
      error,
      response: { status: 400, error: error.message },
      context: failureContext,
    };
  }

  return {
    source: "local",
    error,
    response: { status: 500, error: "device_auth_failed" },
    context: failureContext,
  };
}

function isExpectedDeviceAuthError(
  error: unknown,
  expectedCodes: ReadonlySet<string> | undefined,
): error is Error {
  if (!(error instanceof Error)) return false;
  if (expectedCodes?.has(error.message)) return true;
  if (
    /^provider_token_[a-z0-9_]+$/.test(error.message) ||
    /^invalid_provider_[a-z0-9_]+$/.test(error.message)
  ) {
    return true;
  }

  const code = (error as Error & { code?: unknown }).code;
  if (
    typeof code === "string" &&
    (code.startsWith("ERR_JWT_") || code.startsWith("ERR_JWS_"))
  ) {
    return true;
  }

  return (
    error.message === "Account credential provider is required" ||
    error.message === "Account provider credential is required" ||
    error.message.startsWith("Unsupported account credential provider:") ||
    /^(Privy|Para) (access )?(token|JWT) (is missing|kid did not match)/.test(
      error.message,
    )
  );
}
