import { NextResponse } from "next/server";
import {
  activationEnv,
  appNamesFromDeployment,
  type BackendDeployResult,
  BackendRequestError,
  backendRequest,
  deployRequestBody,
  readOnboardDeployEnv,
  releaseTagsFromDeployment,
  resolveAppSourceId,
} from "@portal/lib/onboard-deploy";
import { isValidInstallationId, isValidRepo } from "@portal/lib/validate-input";
import { validateOrigin } from "@portal/lib/csrf";
import { checkRateLimit, getClientIp } from "@portal/lib/rate-limit";

export function handleDeploy(dryRun: boolean) {
  return async function POST(req: Request): Promise<NextResponse> {
    // Rate limit check
    const ip = getClientIp(req);
    if (!checkRateLimit(ip).allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // CSRF check
    if (!validateOrigin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse body
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    // isValidInstallationId check
    if (!isValidInstallationId(body.installationId)) {
      return NextResponse.json({ error: "invalid `installationId`" }, { status: 400 });
    }

    // Optional isValidRepo check
    if (body.repo !== undefined && !isValidRepo(body.repo)) {
      return NextResponse.json({ error: "invalid `repo`" }, { status: 400 });
    }

    try {
      const env = await activationEnv(readOnboardDeployEnv());
      const appSourceId = await resolveAppSourceId({
        env,
        installationId: body.installationId as string,
        repo: body.repo as string | undefined,
      });
      const result = await backendRequest<BackendDeployResult>(
        env,
        `/api/platforms/${encodeURIComponent(env.platform)}/deploy`,
        { method: "POST", body: deployRequestBody(env, appSourceId, dryRun) },
      );
      return NextResponse.json(
        {
          ok: true,
          repo: body.repo ?? result.deployment?.source?.repository_link,
          deployment: result.deployment,
          releaseTags: releaseTagsFromDeployment(result.deployment),
          apps: appNamesFromDeployment(result.deployment),
        },
        { status: dryRun ? 200 : 202 },
      );
    } catch (err) {
      const status =
        err instanceof BackendRequestError && err.status >= 400 && err.status < 600
          ? err.status
          : 502;
      return NextResponse.json(
        { error: err instanceof Error ? err.message : String(err) },
        { status },
      );
    }
  };
}
