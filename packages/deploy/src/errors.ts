// =============================================================================
// Typed errors
// =============================================================================
//
// Every failure mode the deploy client can raise is a subclass of `DeployError`
// so callers (a proxy route handler) can branch on `err.code` and map to an
// HTTP status without string-matching messages.

export type DeployErrorCode =
  | "BROWSER_ENVIRONMENT"
  | "INVALID_SLUG"
  | "PATH_SCOPE"
  | "EMPTY_BUNDLE"
  | "RESERVED_PATH"
  | "INVALID_COMMIT"
  | "TAG_WIDENING"
  | "GITHUB_COMMIT"
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

/** Thrown when a staged file path escapes `apps/<slug>/` (the per-slug guard). */
export class PathScopeError extends DeployError {
  readonly path: string;
  constructor(path: string, message: string) {
    super("PATH_SCOPE", message);
    this.name = "PathScopeError";
    this.path = path;
  }
}

/** Thrown when `target_tags` is not a subset of the build's `server_tags`. */
export class TagWideningError extends DeployError {
  readonly requested: string[];
  readonly allowed: string[];
  constructor(requested: string[], allowed: string[]) {
    super(
      "TAG_WIDENING",
      `target_tags ${JSON.stringify(requested)} must be a subset of the build's ` +
        `server_tags ${JSON.stringify(allowed)}; re-deploy with the wider tag instead`,
    );
    this.name = "TagWideningError";
    this.requested = requested;
    this.allowed = allowed;
  }
}

/** Thrown when the Aomi backend rejects the activation. */
export class ActivationError extends DeployError {
  readonly status: number;
  readonly body?: string;
  constructor(status: number, message: string, body?: string) {
    super("ACTIVATION", message);
    this.name = "ActivationError";
    this.status = status;
    this.body = body;
  }
}
