import { BackendError, DeployError } from "@aomi-labs/deploy";
import { DeployCliError } from "../errors";
import {
  readDeploymentState,
  writeDeploymentState,
} from "../../lib/deployment-state";
import {
  asCliError,
  deployClient,
  requireToken,
  resolveBackendUrl,
  resolvePlatform,
  str,
} from "./deploy-shared";

type ActivateArgs = Record<string, unknown>;

export async function activateCommand(args: ActivateArgs): Promise<void> {
  const state = await readDeploymentState();

  const deploymentId = str(args["deployment-id"]) ?? state?.deploymentId;
  const releaseTagsRaw = str(args["release-tags"]);
  const releaseTags =
    releaseTagsRaw !== undefined
      ? releaseTagsRaw
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : (state?.releaseTags ?? []);

  if (!deploymentId || releaseTags.length === 0) {
    throw new DeployCliError(
      "VALIDATION_ERROR",
      "No deployment found. Run `aomi deploy` first, or pass --deployment-id and --release-tags.",
    );
  }

  const activationToken = requireToken(args);
  const backendUrl = resolveBackendUrl(args);
  const platform = resolvePlatform(args);
  const client = deployClient(backendUrl, activationToken);

  try {
    await client.activate({
      platform,
      target: { kind: "release_tags", value: releaseTags },
    });
  } catch (err) {
    // Per-app activation failures come back as HTTP 200 + ok:false, which the
    // package raises as a plain ACTIVATION DeployError carrying the per-app
    // errors (BackendError covers transport/HTTP failures). Keep the CLI's
    // stance: report them and treat the activation as applied.
    const partial =
      err instanceof DeployError &&
      !(err instanceof BackendError) &&
      err.code === "ACTIVATION";
    if (!partial) throw asCliError(err);

    const failures = Array.isArray(err.reason)
      ? (err.reason as Array<{ app?: unknown; error?: unknown }>)
      : [];
    if (failures.length > 0) {
      console.log(" Activation completed with errors:");
      for (const f of failures) {
        console.log(`   ${f.app ?? "?"}: ${f.error}`);
      }
    }
  }

  // Update timestamp in deployment.json on success
  if (state) {
    await writeDeploymentState({
      ...state,
      timestamp: new Date().toISOString(),
    });
  }

  console.log(" Activation succeeded.");
}
