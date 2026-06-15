import { execSync } from "child_process";
import { fatal } from "../errors";

type DeployArgs = Record<string, unknown>;

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function required(value: string | undefined, flag: string, env: string): string {
  if (value) return value;
  fatal(`\`--${flag}\` is required. Pass it or set the ${env} env var.`);
}

function currentBranch(): string {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf-8",
    }).trim();
  } catch {
    fatal(
      "Could not detect the current git branch. Pass \`--branch\` or run this command from a git repository.",
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
    fatal("`--app-source-id` must be a positive integer.");
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
  const branch = str(args.branch) ?? currentBranch();
  const aomiTomlPaths = (
    str(args["aomi-toml-paths"]) ?? "aomi.toml"
  )
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const dryRun = args["dry-run"] === true;

  console.log(` Deploying to ${backendUrl} (platform: ${platform})`);
  console.log(`   app source id: ${appSourceId}`);
  console.log(`   branch:        ${branch}`);
  console.log(`   aomi.toml:     ${aomiTomlPaths.join(", ")}`);
  if (dryRun) console.log("   dry run:      yes");

  const url = `${backendUrl}/api/platforms/${encodeURIComponent(platform)}/deploy`;
  const body = {
    app_source_id: appSourceId,
    source_ref: { kind: "branch", value: branch },
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
    fatal(
      `Deploy request failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const text = await res.text();
  if (!res.ok) {
    const message = (() => {
      try {
        const json = JSON.parse(text);
        if (json && typeof json === "object" && json.error) return json.error;
      } catch {}
      return `${res.status} ${res.statusText}`;
    })();
    fatal(`Deploy failed (${res.status}): ${message}`);
  }

  let result: Record<string, unknown>;
  try {
    result = JSON.parse(text) as Record<string, unknown>;
  } catch {
    fatal("Backend returned invalid JSON.");
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
  if (platformInfo?.apps) {
    const apps = platformInfo.apps as Array<Record<string, unknown>>;
    for (const app of apps) {
      const name = app.name ?? "?";
      const tag = app.release_tag ?? app.releaseTag ?? "";
      console.log(`   app:     ${name}${tag ? ` (${tag})` : ""}`);
    }
  }

  if (platformInfo?.commit_hash) {
    console.log(`   commit:  ${platformInfo.commit_hash}`);
  }
}
