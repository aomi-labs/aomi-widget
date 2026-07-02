import { execSync } from "child_process";
import type { DeployResult, SourceRef } from "@aomi-labs/deploy";
import { DeployCliError } from "../errors";
import { writeDeploymentState } from "../../lib/deployment-state";
import {
  asCliError,
  deployClient,
  resolveBackendUrl,
  resolvePlatform,
  str,
} from "./deploy-shared";

type DeployArgs = Record<string, unknown>;

function required(
  value: string | undefined,
  flag: string,
  env: string,
): string {
  if (value) return value;
  throw new DeployCliError(
    "VALIDATION_ERROR",
    `\`--${flag}\` is required. Pass it or set the ${env} env var.`,
  );
}

function currentBranch(): string {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf-8",
    }).trim();
  } catch {
    throw new DeployCliError(
      "NOT_A_GIT_REPO",
      "Run this from inside a git repository",
    );
  }
}

function checkGitRemote(): void {
  try {
    const remote = execSync("git remote", { encoding: "utf-8" }).trim();
    if (!remote) {
      throw new DeployCliError(
        "VALIDATION_ERROR",
        "No git remote found; push your code first",
      );
    }
  } catch (err) {
    if (err instanceof DeployCliError) throw err;
    throw new DeployCliError(
      "VALIDATION_ERROR",
      "No git remote found; push your code first",
    );
  }
}

interface DeviceAuthResult {
  token: string;
  githubLogin: string;
}

async function deviceAuthFlow(
  backendUrl: string,
  platform: string,
): Promise<DeviceAuthResult> {
  console.log(
    "\n No activation token found. Starting browser-based GitHub auth...\n",
  );

  const beginRes = await fetch(`${backendUrl}/api/auth/cli/begin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ platform }),
  });

  if (!beginRes.ok) {
    const text = await beginRes.text().catch(() => "");
    throw new DeployCliError(
      "BACKEND_ERROR",
      `Failed to start device auth: ${beginRes.status} ${text}`,
    );
  }

  const { device_code, verification_uri } = (await beginRes.json()) as {
    device_code: string;
    verification_uri: string;
  };

  console.log(" → Open this URL in your browser to authenticate with GitHub:");
  console.log(`   ${verification_uri}\n`);

  // Try to open the browser automatically (firefox on macOS, xdg-open on Linux)
  const { platform: os } = process;
  const openCmd =
    os === "darwin" ? "open" : os === "win32" ? "start" : "xdg-open";
  try {
    execSync(`${openCmd} "${verification_uri}"`, { stdio: "ignore" });
    console.log(" (Browser opened automatically.)\n");
  } catch {
    // Browser open failed — the URL was already printed above.
  }

  console.log(" Waiting for authorization...");

  const pollUrl = `${backendUrl}/api/auth/cli/status?device_code=${device_code}`;
  const start = Date.now();
  const timeoutMs = 600_000; // 10 minutes — matches backend session TTL

  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, 2000));

    const statusRes = await fetch(pollUrl);
    if (!statusRes.ok) continue;

    const body = (await statusRes.json()) as {
      status: string;
      activation_token?: string;
      github_login?: string;
    };

    if (body.status === "complete" && body.activation_token) {
      console.log(` Authenticated as @${body.github_login ?? "?"}\n`);
      console.log(
        " Tip: save your token to skip this step next time:\n" +
          `   export AOMI_DEPLOY_TOKEN="${body.activation_token}"\n`,
      );
      return {
        token: body.activation_token,
        githubLogin: body.github_login ?? "",
      };
    }

    if (body.status === "expired") {
      throw new DeployCliError(
        "AUTH_FAILED",
        "Authorization session expired. Run `aomi deploy` again to retry.",
      );
    }
  }

  throw new DeployCliError(
    "AUTH_TIMEOUT",
    "Authorization timed out after 10 minutes. Run `aomi deploy` again to retry.",
  );
}

export async function deployCommand(args: DeployArgs): Promise<void> {
  const backendUrl = resolveBackendUrl(args);
  const platform = resolvePlatform(args);

  const activationToken =
    str(args["activation-token"]) ??
    process.env.AOMI_DEPLOY_TOKEN ??
    (await deviceAuthFlow(backendUrl, platform)).token;

  const appSourceId = Number(
    required(
      str(args["app-source-id"]) ?? process.env.AOMI_APP_SOURCE_ID,
      "app-source-id",
      "AOMI_APP_SOURCE_ID",
    ),
  );
  if (!Number.isSafeInteger(appSourceId) || appSourceId <= 0) {
    throw new DeployCliError(
      "VALIDATION_ERROR",
      "`--app-source-id` must be a positive integer.",
    );
  }

  const branch = str(args.branch);
  const commit = str(args.commit);

  if (branch && commit) {
    throw new DeployCliError(
      "VALIDATION_ERROR",
      "--commit and --branch are mutually exclusive. Provide one or neither.",
    );
  }

  const sourceRef: SourceRef = commit
    ? { kind: "commit", value: commit }
    : { kind: "branch", value: branch ?? currentBranch() };

  if (!commit && !branch) {
    checkGitRemote();
  }

  const aomiTomlPaths = (str(args["aomi-toml-paths"]) ?? "aomi.toml")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const preflight = args["preflight"] === true;

  console.log(` Deploying to ${backendUrl} (platform: ${platform})`);
  console.log(`   app source id: ${appSourceId}`);
  if (sourceRef.kind === "commit") {
    console.log(`   commit:        ${sourceRef.value}`);
  } else {
    console.log(`   branch:        ${sourceRef.value}`);
  }
  console.log(`   aomi.toml:     ${aomiTomlPaths.join(", ")}`);
  if (preflight) console.log("   preflight:      yes");

  const client = deployClient(backendUrl, activationToken);
  let result: DeployResult;
  try {
    result = await client.deploy({
      platform,
      appSourceId,
      sourceRef,
      aomiTomlPaths,
      preflight,
    });
  } catch (err) {
    throw asCliError(err);
  }

  const { deployment } = result;

  console.log();
  if (preflight) {
    console.log(" Preflight complete. Review the manifest below:");
    console.log(`   ${JSON.stringify(result, null, 2)}`);
    return;
  }

  console.log(` Deployment created: ${deployment.id ?? "unknown"}`);
  console.log(`   status:  ${deployment.status ?? "unknown"}`);
  if (deployment.source.repositoryLink) {
    console.log(`   source:  ${deployment.source.repositoryLink}`);
  }
  if (deployment.platform.prUrl) {
    console.log(`   PR:      ${deployment.platform.prUrl}`);
  }
  if (deployment.platform.ciUrl) {
    console.log(`   CI:      ${deployment.platform.ciUrl}`);
  }

  const releaseTags: string[] = [];
  const apps: string[] = [];

  for (const app of deployment.platform.apps) {
    const name = String(app.name ?? "?");
    const tag = app.releaseTag ?? "";
    apps.push(name);
    if (tag) releaseTags.push(tag);
    console.log(`   app:     ${name}${tag ? ` (${tag})` : ""}`);
  }

  if (deployment.platform.commitHash) {
    console.log(`   commit:  ${deployment.platform.commitHash}`);
  }

  // Persist deployment state for use by `aomi deploy status` and `aomi deploy activate`
  const deploymentId = String(deployment.id ?? "");
  if (deploymentId) {
    await writeDeploymentState({
      deploymentId,
      platform,
      appSourceId,
      releaseTags,
      apps,
      timestamp: new Date().toISOString(),
    });
  }
}
