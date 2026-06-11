// =============================================================================
// Typed errors
// =============================================================================
//
// Every failure mode the deploy client can raise is a subclass of `DeployError`
// so callers (a proxy route handler) can branch on `err.code` and map to an
// HTTP status without string-matching messages.

export type DeployErrorCode =
  | "BROWSER_ENVIRONMENT"
  | "INVALID_REQUEST"
  | "BACKEND"
  | "ACTIVATION"
  | "ACTIVATION_REQUEST";

export class DeployError extends Error {
  readonly code: DeployErrorCode;
  readonly reason?: unknown;

  constructor(code: DeployErrorCode, message: string, reason?: unknown) {
    super(message);
    this.name = "DeployError";
    this.code = code;
    this.reason = reason;
  }
}

/** Thrown when the module is imported into a browser-like environment. */
export class BrowserEnvironmentError extends DeployError {
  constructor(message: string) {
    super("BROWSER_ENVIRONMENT", message);
    this.name = "BrowserEnvironmentError";
  }
}

/** Thrown when the Aomi backend rejects a deploy/activate/status call. */
export class BackendError extends DeployError {
  readonly status: number;
  readonly body?: string;
  constructor(operation: string, status: number, message: string, body?: string) {
    super(operation === "activation" ? "ACTIVATION" : "BACKEND", message);
    this.name = operation === "activation" ? "ActivationError" : "BackendError";
    this.status = status;
    this.body = body;
  }
}

/** Backward-compatible class name for callers already branching on activation failures. */
export class ActivationError extends BackendError {
  constructor(status: number, message: string, body?: string) {
    super("activation", status, message, body);
  }
}
