import "server-only";

import type { SourceRef } from "@aomi-labs/deploy";
import { resolveDeployPlatform } from "@portal/lib/deploy-platform";

const TEMPLATE_REPO = "aomi-labs/playground-example";
const CREATED_REPO_PRIVATE = false;
const SOURCE_REF: SourceRef = { kind: "branch", value: "main" };
const AOMI_TOML_PATHS = ["aomi.toml"];
const TARGET_TAGS: string[] = [];

export type LaunchConfig = {
  platform: string;
  templateRepo: string;
  createdRepoPrivate: boolean;
  sourceRef: SourceRef;
  aomiTomlPaths: string[];
  targetTags: string[];
};

export function launchConfig(): LaunchConfig {
  return {
    platform: resolveDeployPlatform(),
    templateRepo: TEMPLATE_REPO,
    createdRepoPrivate: CREATED_REPO_PRIVATE,
    sourceRef: { ...SOURCE_REF },
    aomiTomlPaths: [...AOMI_TOML_PATHS],
    targetTags: [...TARGET_TAGS],
  };
}
