import { DeployCliError } from "../errors";
import { readDeploymentState, writeDeploymentState } from "../../lib/deployment-state";

type ActivateArgs = Record<string, unknown>;

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function requireToken(args: ActivateArgs): string {
  const token = str(args["activation-token"]) ?? process.env.AOMI_DEPLOY_TOKEN;
  if (!token) {
    throw new DeployCliError(
      "VALIDATION_ERROR",
      "`--activation-token` is required. Pass it or set the AOMI_DEPLOY_TOKEN env var.",
    );
  }
  return token;
}

function resolveBackendUrl(args: ActivateArgs): string {
  return (
    str(args["backend-url"]) ??
    process.env.AOMI_BACKEND_URL ??
    "https://api.aomi.dev"
  ).replace(/\/+$/, "");
}

function resolvePlatform(args: ActivateArgs): string {
  return (
    str(args.platform) ??
    process.env.AOMI_DEPLOY_PLATFORM ??
    "community"
  );
}

async function extractError(res: Response): Promise<string> {
  try {
    const text = await res.text();
    const json = JSON.parse(text);
    if (json && typeof json === "object" && json.error) return json.error as string;
    return text || `${res.status} ${res.statusText}`;
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}

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

  const url = `${backendUrl}/api/platforms/${encodeURIComponent(platform)}/apps/activate`;
  const body = { target: { kind: "release_tags", value: releaseTags } };

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${activationToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new DeployCliError(
      "NETWORK_ERROR",
      `Activation request failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!res.ok) {
    const msg = await extractError(res);
    const code = res.status === 401 || res.status === 403 ? "AUTH_FAILED" : "BACKEND_ERROR";
    throw new DeployCliError(code, `Activation failed (${res.status}): ${msg}`);
  }

  // Update timestamp in deployment.json on success
  if (state) {
    await writeDeploymentState({ ...state, timestamp: new Date().toISOString() });
  }

  console.log(" Activation succeeded.");
}
