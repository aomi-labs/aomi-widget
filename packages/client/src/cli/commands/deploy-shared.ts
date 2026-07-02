// Shared seam between the deploy CLI commands and @aomi-labs/deploy, the
// single wire-contract implementation for the platform deploy API: common
// arg/env resolution, client construction, and mapping of the package's typed
// errors onto the CLI's DeployCliError.
//
// @aomi-labs/deploy is Node-only. This module is reached exclusively through
// the dynamic `await import(...)` in the deploy command defs (the same pattern
// root.ts uses for ./repl), so it never enters the browser/library bundle.
import { BackendError, DeployError, DeploymentClient } from "@aomi-labs/deploy";
import { DeployCliError, mapDeployHttpError } from "../errors";

type Args = Record<string, unknown>;

export function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function resolveBackendUrl(args: Args): string {
  return (
    str(args["backend-url"]) ??
    process.env.AOMI_BACKEND_URL ??
    "https://api.aomi.dev"
  ).replace(/\/+$/, "");
}

export function resolvePlatform(args: Args): string {
  return str(args.platform) ?? process.env.AOMI_DEPLOY_PLATFORM ?? "community";
}

export function requireToken(args: Args): string {
  const token = str(args["activation-token"]) ?? process.env.AOMI_DEPLOY_TOKEN;
  if (!token) {
    throw new DeployCliError(
      "VALIDATION_ERROR",
      "`--activation-token` is required. Pass it or set the AOMI_DEPLOY_TOKEN env var.",
    );
  }
  return token;
}

export function deployClient(
  backendUrl: string,
  activationToken: string,
): DeploymentClient {
  return new DeploymentClient({ aomi: { backendUrl, activationToken } });
}

/**
 * Best backend-provided message for a failed HTTP call: `error`/`reason` from
 * the JSON body, else the package's own message (e.g. "deploy failed (500)").
 */
function backendMessage(err: BackendError): string {
  try {
    const json = JSON.parse(err.body ?? "") as Record<string, unknown>;
    const message = json?.error ?? json?.reason;
    if (typeof message === "string" && message.trim()) return message;
  } catch {}
  return err.message;
}

/**
 * Map a @aomi-labs/deploy failure onto the CLI's DeployCliError; anything the
 * package didn't raise passes through unchanged. Callers `throw asCliError(e)`.
 */
export function asCliError(err: unknown): unknown {
  if (err instanceof BackendError) {
    if (err.status === 0) {
      return new DeployCliError(
        "NETWORK_ERROR",
        "Cannot reach Aomi backend; check your connection",
      );
    }
    if (err.status === 401 || err.status === 403) {
      return new DeployCliError(
        "AUTH_FAILED",
        "Session expired; run `aomi account login`",
      );
    }
    return mapDeployHttpError(err.status, backendMessage(err));
  }
  if (err instanceof DeployError) {
    const code =
      err.code === "INVALID_REQUEST" || err.code === "ACTIVATION_REQUEST"
        ? "VALIDATION_ERROR"
        : "BACKEND_ERROR";
    return new DeployCliError(code, err.message);
  }
  return err;
}
