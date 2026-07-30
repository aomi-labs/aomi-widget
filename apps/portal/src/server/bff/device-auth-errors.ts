import type { FailureInput } from "@aomi-labs/bff-observability";

type DeviceAuthFailureContext = {
  routeFamily: string;
  operation: string;
  fallbackError?: string;
};

export function identifyDeviceAuthFailure(
  error: unknown,
  context: DeviceAuthFailureContext,
): FailureInput {
  const failureContext = {
    routeFamily: context.routeFamily,
    operation: context.operation,
    method: "POST",
  };

  return {
    source: "expected",
    error,
    response: {
      status: 400,
      error:
        error instanceof Error
          ? error.message
          : (context.fallbackError ?? "invalid_request"),
    },
    context: failureContext,
  };
}
