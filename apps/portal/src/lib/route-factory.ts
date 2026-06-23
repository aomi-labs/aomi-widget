import { NextResponse } from "next/server";
import {
  appNamesFromDeployment,
  getDeploymentClient,
  onboardConfig,
  onboardErrorResponse,
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
      const config = onboardConfig();
      const client = await getDeploymentClient();
      const appSourceId = await resolveAppSourceId({
        client,
        platform: config.platform,
        installationId: body.installationId as string,
        repo: body.repo as string | undefined,
      });
      const { deployment } = await client.deploy({
        platform: config.platform,
        appSourceId,
        sourceRef: config.sourceRef,
        aomiTomlPaths: config.aomiTomlPaths,
        dryRun,
        actor: typeof body.actor === "string" ? body.actor : undefined,
      });
      return NextResponse.json(
        {
          ok: true,
          repo:
            (body.repo as string | undefined) ??
            deployment.source.repositoryLink,
          deployment,
          releaseTags: releaseTagsFromDeployment(deployment),
          apps: appNamesFromDeployment(deployment),
        },
        { status: dryRun ? 200 : 202 },
      );
    } catch (err) {
      return onboardErrorResponse(err);
    }
  };
}
