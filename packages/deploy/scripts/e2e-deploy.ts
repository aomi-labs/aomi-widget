/**
 * Live E2E for @aomi-labs/deploy.
 *
 * Required env:
 *   AOMI_BACKEND_URL
 *   AOMI_APP_ACTIVATION_TOKEN
 *   AOMI_PLATFORM
 *   AOMI_APP_SOURCE_ID
 *
 * Optional env:
 *   AOMI_SOURCE_BRANCH=main
 *   AOMI_SOURCE_COMMIT=<sha>
 *   AOMI_TOML_PATHS=aomi.toml,apps/bot/aomi.toml
 *   AOMI_ACTIVATE=1
 */
import { DeploymentClient } from "../src/index";
import type { SourceRef, TargetRef } from "../src/index";

const backendUrl = requiredEnv("AOMI_BACKEND_URL");
const activationToken = requiredEnv("AOMI_APP_ACTIVATION_TOKEN");
const platform = requiredEnv("AOMI_PLATFORM");
const appSourceId = Number.parseInt(requiredEnv("AOMI_APP_SOURCE_ID"), 10);
const aomiTomlPaths = (process.env.AOMI_TOML_PATHS ?? "aomi.toml")
  .split(",")
  .map((path) => path.trim())
  .filter(Boolean);

if (!Number.isSafeInteger(appSourceId) || appSourceId <= 0) {
  throw new Error("AOMI_APP_SOURCE_ID must be a positive integer");
}

const sourceRef: SourceRef = process.env.AOMI_SOURCE_COMMIT
  ? { kind: "commit", value: process.env.AOMI_SOURCE_COMMIT }
  : { kind: "branch", value: process.env.AOMI_SOURCE_BRANCH ?? "main" };

const dc = new DeploymentClient({
  aomi: { backendUrl, activationToken },
  onAudit: (event) => console.log("audit", JSON.stringify(event)),
});

const deploy = await dc.deploy({
  platform,
  appSourceId,
  sourceRef,
  aomiTomlPaths,
  dryRun: process.env.AOMI_ACTIVATE !== "1",
});

console.log(JSON.stringify(deploy, null, 2));

if (process.env.AOMI_ACTIVATE === "1") {
  const target = activationTarget(deploy.deployment.platform.prUrl, deploy.deployment.platform.sourceBranch);
  const activation = await dc.activate({
    platform,
    target,
    apps: deploy.deployment.platform.apps.map((app) => app.name),
    targetTags: ["staging"],
  });
  console.log(JSON.stringify(activation, null, 2));
}

function activationTarget(prUrl: string | null, sourceBranch: string): TargetRef {
  if (prUrl) return { kind: "platform_pr", value: prUrl };
  return { kind: "platform_branch", value: sourceBranch };
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}
