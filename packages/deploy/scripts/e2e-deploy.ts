/**
 * Live E2E for @aomi-labs/deploy.
 *
 * Required env:
 *   AOMI_BACKEND_URL
 *   AOMI_APP_ACTIVATION_TOKEN
 *   AOMI_PLATFORM
 *   AOMI_APP_SOURCE_ID
 *
 *   AOMI_SOURCE_REF=<sha>
 *
 * Optional env:
 *   AOMI_SOURCE_COMMIT=<sha> (legacy alias for AOMI_SOURCE_REF)
 *   AOMI_TOML_PATHS=aomi.toml,apps/bot/aomi.toml
 *   AOMI_ACTIVATE=1
 */
import { DeploymentClient } from "../src/index";
import type { SourceRef } from "../src/index";

const backendUrl = requiredEnv("AOMI_BACKEND_URL");
const activationToken = requiredEnv("AOMI_APP_ACTIVATION_TOKEN");
const platform = requiredEnv("AOMI_PLATFORM");
const projectId = Number.parseInt(requiredEnv("AOMI_APP_SOURCE_ID"), 10);
const applications = (process.env.AOMI_TOML_PATHS ?? "")
  .split(",")
  .map((path) => path.trim())
  .filter(Boolean);

if (!Number.isSafeInteger(projectId) || projectId <= 0) {
  throw new Error("AOMI_APP_SOURCE_ID must be a positive integer");
}

const sourceRef: SourceRef =
  process.env.AOMI_SOURCE_REF?.trim() ||
  process.env.AOMI_SOURCE_COMMIT?.trim() ||
  "";
if (!sourceRef) {
  throw new Error("AOMI_SOURCE_REF or AOMI_SOURCE_COMMIT is required");
}

const dc = new DeploymentClient({
  aomi: { backendUrl, activationToken },
  onAudit: (event) => console.log("audit", JSON.stringify(event)),
});

const deployInput = {
  platform,
  projectId,
  sourceRef,
  projectConfig: applications.length
    ? { version: 1 as const, applications }
    : undefined,
};

const deploy =
  process.env.AOMI_ACTIVATE === "1"
    ? await dc.deploy(deployInput)
    : await dc.preflight(deployInput);

console.log(JSON.stringify(deploy, null, 2));

if (process.env.AOMI_ACTIVATE === "1") {
  const activation = await dc.activate({
    platform,
    target: {
      kind: "release_tags",
      value: deploy.deployment.platform.apps.map((app) => app.releaseTag),
    },
    apps: deploy.deployment.platform.apps.map((app) => app.name),
    targetTags: ["staging"],
  });
  console.log(JSON.stringify(activation, null, 2));
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}
