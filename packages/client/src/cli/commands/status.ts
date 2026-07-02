import type { DeploymentStatus } from "@aomi-labs/deploy";
import { BackendError } from "@aomi-labs/deploy";
import { DeployCliError } from "../errors";
import { readDeploymentState } from "../../lib/deployment-state";
import {
  asCliError,
  deployClient,
  requireToken,
  resolveBackendUrl,
  resolvePlatform,
  str,
} from "./deploy-shared";

type StatusArgs = Record<string, unknown>;

function printStatus(status: DeploymentStatus): void {
  const CYAN = "\x1b[36m";
  const DIM = "\x1b[2m";
  const RESET = "\x1b[0m";

  console.log(`${CYAN}State:${RESET} ${status.state}`);

  if (status.ci?.url) {
    console.log(`${DIM}CI:${RESET}    ${status.ci.url}`);
  }

  const prUrl = status.deployment?.platform.prUrl;
  if (prUrl) {
    console.log(`${DIM}PR:${RESET}    ${prUrl}`);
  }

  if (status.apps && status.apps.length > 0) {
    for (const app of status.apps) {
      const tag = app.releaseTag ? ` (${app.releaseTag})` : "";
      console.log(`${DIM}App:${RESET}   ${app.name}${tag}`);
    }
  } else if (status.releaseTags && status.releaseTags.length > 0) {
    for (const tag of status.releaseTags) {
      console.log(`${DIM}Tag:${RESET}   ${tag}`);
    }
  }

  if (status.message) {
    console.log(`${DIM}Msg:${RESET}   ${status.message}`);
  }
}

export async function statusCommand(args: StatusArgs): Promise<void> {
  const deploymentId =
    str(args["deployment-id"]) ?? (await readDeploymentState())?.deploymentId;

  if (!deploymentId) {
    throw new DeployCliError(
      "VALIDATION_ERROR",
      "No deployment ID found. Pass --deployment-id or run `aomi deploy` first.",
    );
  }

  const activationToken = requireToken(args);
  const backendUrl = resolveBackendUrl(args);
  const platform = resolvePlatform(args);
  const watch = args.watch === true;
  const client = deployClient(backendUrl, activationToken);

  if (!watch) {
    let status: DeploymentStatus;
    try {
      status = await client.status({ platform, deploymentId });
    } catch (err) {
      throw asCliError(err);
    }
    printStatus(status);
    return;
  }

  // --watch: the package polls (3s ticks, exponential backoff to 30s, 8
  // consecutive failures max) and reports each tick through onEvent; terminal
  // states set the exit code.
  const MAX_FAILURES = 8;
  let lastCiUrl: string | undefined;

  await client.watchDeployment(deploymentId, platform, (event) => {
    if (event.kind === "progress" || event.kind === "terminal") {
      if (event.status.ci?.url) lastCiUrl = event.status.ci.url;
      printStatus(event.status);
    }
    if (event.kind === "terminal") {
      process.exit(event.status.state === "ready" ? 0 : 1);
    }
    if (event.kind === "error") {
      // Non-retryable HTTP error (e.g. expired token) — surface it directly.
      if (event.error instanceof BackendError) throw asCliError(event.error);
      const ciSuffix = lastCiUrl ? `; check CI status at ${lastCiUrl}` : "";
      throw new DeployCliError(
        "BACKEND_ERROR",
        `Deployment timed out after ${MAX_FAILURES} attempts${ciSuffix}`,
      );
    }
  });
}
