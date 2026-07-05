import "server-only";

import { NextResponse } from "next/server";
import { BackendError, DeployError } from "@aomi-labs/deploy";

function backendErrorMessage(body?: string): string | null {
  if (!body) return null;
  try {
    const json = JSON.parse(body) as { error?: unknown };
    return typeof json.error === "string" ? json.error : null;
  } catch {
    return null;
  }
}

function activationErrorMessage(err: unknown): string | null {
  if (!(err instanceof DeployError)) return null;
  const reason = err.reason;
  if (Array.isArray(reason)) {
    const first = reason.find(
      (r): r is { app?: string; error?: string } =>
        typeof r === "object" && r !== null && "error" in r,
    );
    if (first?.error) return first.error;
  }
  return null;
}

export function launchErrorResponse(err: unknown): NextResponse {
  let status = 502;
  let message = err instanceof Error ? err.message : String(err);
  if (err instanceof BackendError) {
    if (err.status >= 400 && err.status < 600) status = err.status;
    message =
      backendErrorMessage(err.body) ?? activationErrorMessage(err) ?? message;
  } else if (err instanceof DeployError) {
    if (err.code === "INVALID_REQUEST") status = 400;
    message = activationErrorMessage(err) ?? message;
  }
  return NextResponse.json({ error: message }, { status });
}

export { BackendError, DeployError } from "@aomi-labs/deploy";
