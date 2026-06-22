import { execSync } from "child_process";
import { DeployCliError } from "../errors";
import { writeDeploymentState } from "../../lib/deployment-state";

type DeployArgs = Record<string, unknown>;

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function required(value: string | undefined, flag: string, env: string): string {
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

export async function deployCommand(args: DeployArgs): Promise<void> {
  const activationToken = required(
    str(args["activation-token"]) ?? process.env.AOMI_DEPLOY_TOKEN,
    "activation-token",
    "AOMI_DEPLOY_TOKEN",
  );
  const appSourceId = Number(
    required(
      str(args["app-source-id"]) ?? process.env.AOMI_APP_SOURCE_ID,
      "app-source-id",
      "AOMI_APP_SOURCE_ID",
    ),
  );
  if (!Number.isSafeInteger(appSourceId) || appSourceId <= 0) {
    throw new DeployCliError("VALIDATION_ERROR", "`--app-source-id` must be a positive integer.");
  }

  const backendUrl = (
    str(args["backend-url"]) ??
    process.env.AOMI_BACKEND_URL ??
    "https://api.aomi.dev"
  ).replace(/\/+$/, "");
  const platform =
    str(args.platform) ??
    process.env.AOMI_DEPLOY_PLATFORM ??
    "community";

  const branch = str(args.branch);
  const commit = str(args.commit);

  if (branch && commit) {
    throw new DeployCliError(
      "VALIDATION_ERROR",
      "--commit and --branch are mutually exclusive. Provide one or neither.",
    );
  }

  const sourceRef = commit
    ? { kind: "commit", value: commit }
    : { kind: "branch", value: branch ?? currentBranch() };

  if (!commit && !branch) {
    checkGitRemote();
  }

  const aomiTomlPaths = (
    str(args["aomi-toml-paths"]) ?? "aomi.toml"
  )
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const dryRun = args["dry-run"] === true;

  console.log(` Deploying to ${backendUrl} (platform: ${platform})`);
  console.log(`   app source id: ${appSourceId}`);
  if (sourceRef.kind === "commit") {
    console.log(`   commit:        ${sourceRef.value}`);
  } else {
    console.log(`   branch:        ${sourceRef.value}`);
  }
  console.log(`   aomi.toml:     ${aomiTomlPaths.join(", ")}`);
  if (dryRun) console.log("   dry run:      yes");

  const url = `${backendUrl}/api/platforms/${encodeURIComponent(platform)}/deploy`;
  const body = {
    app_source_id: appSourceId,
    source_ref: sourceRef,
    aomi_toml_paths: aomiTomlPaths,
    dry_run: dryRun,
  };

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
      "Cannot reach Aomi backend; check your connection",
    );
  }

  const text = await res.text();
  if (!res.ok) {
    const message = (() => {
      try {
        const json = JSON.parse(text);
        if (json && typeof json === "object") return json.error as string ?? json.reason as string ?? `${res.status} ${res.statusText}`;
      } catch {}
      return `${res.status} ${res.statusText}`;
    })();
    if (res.status === 401 || res.status === 403) {
      throw new DeployCliError("AUTH_FAILED", "Session expired; run `aomi account login`");
    }
    throw new DeployCliError("BACKEND_ERROR", message);
  }

  let result: Record<string, unknown>;
  try {
    result = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new DeployCliError("BACKEND_ERROR", "Backend returned invalid JSON.");
  }

  const deployment = result.deployment as Record<string, unknown> | undefined;
  const platformInfo = deployment?.platform as Record<string, unknown> | undefined;
  const sourceInfo = deployment?.source as Record<string, unknown> | undefined;

  console.log();
  if (dryRun) {
    console.log(" Dry run complete. Review the manifest below:");
    console.log(`   ${JSON.stringify(result, null, 2)}`);
    return;
  }

  console.log(` Deployment created: ${deployment?.id ?? "unknown"}`);
  console.log(`   status:  ${deployment?.status ?? "unknown"}`);
  if (sourceInfo?.repository_link) {
    console.log(`   source:  ${sourceInfo.repository_link}`);
  }
  if (platformInfo?.pr_url) {
    console.log(`   PR:      ${platformInfo.pr_url}`);
  }
  if (platformInfo?.ci_url) {
    console.log(`   CI:      ${platformInfo.ci_url}`);
  }

  const releaseTags: string[] = [];
  const apps: string[] = [];

  if (platformInfo?.apps) {
    const appsArr = platformInfo.apps as Array<Record<string, unknown>>;
    for (const app of appsArr) {
      const name = String(app.name ?? "?");
      const tag = String(app.release_tag ?? app.releaseTag ?? "");
      apps.push(name);
      if (tag) releaseTags.push(tag);
      console.log(`   app:     ${name}${tag ? ` (${tag})` : ""}`);
    }
  }

  if (platformInfo?.commit_hash) {
    console.log(`   commit:  ${platformInfo.commit_hash}`);
  }

  // Persist deployment state for use by `aomi deploy status` and `aomi deploy activate`
  const deploymentId = String(deployment?.id ?? "");
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
