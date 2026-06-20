import { NextResponse } from "next/server";

export const runtime = "nodejs";

import {
  activationEnv,
  BackendRequestError,
  type BackendDeploymentStatusResult,
  backendRequest,
  readOnboardDeployEnv,
  releaseTagsFromDeployment,
} from "@portal/lib/onboard-deploy";
import { checkRateLimit, getClientIp } from "@portal/lib/rate-limit";
import { isValidDeploymentId } from "@portal/lib/validate-input";

function isPendingDeploymentStatusError(err: unknown): boolean {
  if (!(err instanceof BackendRequestError)) return false;
  if (err.status === 404) return true;
  const message = err.message.toLowerCase();
  return (
    message.includes("deployment") &&
    (message.includes("not found") ||
      message.includes("missing") ||
      message.includes("no deployment"))
  );
}

export async function GET(req: Request) {
  const ip = getClientIp(req);
  if (!checkRateLimit(ip).allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const deploymentId = new URL(req.url).searchParams.get("deploymentId");
  if (!isValidDeploymentId(deploymentId)) {
    return NextResponse.json(
      { error: "missing or invalid `deploymentId`" },
      { status: 400 },
    );
  }

  try {
    const env = await activationEnv(readOnboardDeployEnv());
    const result = await backendRequest<BackendDeploymentStatusResult>(
      env,
      `/api/platforms/${encodeURIComponent(env.platform)}/deployments/${encodeURIComponent(
        deploymentId,
      )}/status`,
    );
    return NextResponse.json({
      ...result,
      releaseTags: releaseTagsFromDeployment(result.deployment),
    });
  } catch (err) {
    if (isPendingDeploymentStatusError(err)) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({
        state: "pending",
        releaseTags: [],
        message,
        retryIn: 3000,
      });
    }
    const status =
      err instanceof BackendRequestError && err.status >= 400 && err.status < 600
        ? err.status
        : 502;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status },
    );
  }
}
