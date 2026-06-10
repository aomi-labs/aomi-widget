import "server-only";

import { DeploymentClient } from "@aomi-labs/deploy";
import type { SourceRef } from "@aomi-labs/deploy";

export const EXAMPLE_REPO = "CeciliaZ030/my-aomi-bots";
export const EXAMPLE_REPO_URL = `https://github.com/${EXAMPLE_REPO}`;

const PLATFORM = process.env.APP_DEPLOY_PLATFORM || "playground";
const OPS_MENTION = "<@&1510790865520693348>";
const DISCORD_WEBHOOK = process.env.APP_DEPLOY_DISCORD_WEBHOOK || undefined;

function resolveBackendUrl(): string {
  return (
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://localhost:8080"
  );
}

export interface DeployEnv {
  activationToken: string;
  appSourceId: number;
  platform: string;
  backendUrl: string;
  sourceRef: SourceRef;
  aomiTomlPaths: string[];
  discordWebhook?: string;
  opsMention?: string;
}

export function readDeployEnv(): DeployEnv {
  const activationToken = process.env.APP_DEPLOY_ACTIVATION_TOKEN;
  if (!activationToken) {
    throw new Error(
      "deploy proxy is not configured: set APP_DEPLOY_ACTIVATION_TOKEN",
    );
  }
  const appSourceId = Number.parseInt(
    process.env.APP_DEPLOY_APP_SOURCE_ID ?? "",
    10,
  );
  if (!Number.isSafeInteger(appSourceId) || appSourceId <= 0) {
    throw new Error(
      "deploy proxy is not configured: set APP_DEPLOY_APP_SOURCE_ID",
    );
  }
  const sourceRef: SourceRef = process.env.APP_DEPLOY_SOURCE_COMMIT
    ? { kind: "commit", value: process.env.APP_DEPLOY_SOURCE_COMMIT }
    : { kind: "branch", value: process.env.APP_DEPLOY_SOURCE_BRANCH || "main" };
  const aomiTomlPaths = (process.env.APP_DEPLOY_AOMI_TOML_PATHS || "aomi.toml")
    .split(",")
    .map((path) => path.trim())
    .filter(Boolean);
  return {
    activationToken,
    appSourceId,
    platform: PLATFORM,
    backendUrl: resolveBackendUrl(),
    sourceRef,
    aomiTomlPaths,
    discordWebhook: DISCORD_WEBHOOK,
    opsMention: OPS_MENTION,
  };
}

export function getDeploymentClient(
  env: DeployEnv = readDeployEnv(),
): DeploymentClient {
  return new DeploymentClient({
    aomi: { backendUrl: env.backendUrl, activationToken: env.activationToken },
    onAudit: (e) => {
      console.log("[deploy-proxy] audit", JSON.stringify(e));
    },
  });
}

export function appSlug(name: string | undefined | null): string {
  return (name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function appNameFromReleaseTag(releaseTag: string): string | null {
  const tag = releaseTag.trim();
  const rest = tag.startsWith("apps-") ? tag.slice("apps-".length) : "";
  const firstDash = rest.indexOf("-");
  const lastDash = rest.lastIndexOf("-");
  if (firstDash <= 0 || lastDash <= firstDash + 1) return null;
  return rest.slice(firstDash + 1, lastDash) || null;
}

export function deployInput(env: DeployEnv, dryRun: boolean, actor?: string) {
  return {
    platform: env.platform,
    appSourceId: env.appSourceId,
    sourceRef: env.sourceRef,
    aomiTomlPaths: env.aomiTomlPaths,
    dryRun,
    actor,
  };
}
