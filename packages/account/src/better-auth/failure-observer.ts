export type BetterAuthFailure = {
  kind: "api_error";
  error: unknown;
  status?: number;
};

export type ObserveBetterAuthFailure = (
  failure: BetterAuthFailure,
) => void | Promise<void>;

let observer: ObserveBetterAuthFailure | undefined;

export function setBetterAuthFailureObserver(
  nextObserver: ObserveBetterAuthFailure | undefined,
): void {
  observer = nextObserver;
}

export function observeBetterAuthFailure(error: unknown): void {
  try {
    const result = observer?.({
      kind: "api_error",
      error,
      status: apiErrorStatus(error),
    });
    if (result) void result.catch(() => {});
  } catch {
    // Observability is best-effort and must not alter auth behavior.
  }
}

function apiErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object" || !("statusCode" in error)) {
    return undefined;
  }
  const status = Number(error.statusCode);
  return Number.isInteger(status) && status >= 100 && status <= 599
    ? status
    : undefined;
}
