import { defineCommand } from "citty";
import { globalArgs } from "./shared";

export const deployDef = defineCommand({
  meta: {
    name: "deploy",
    description: "Deploy your app to the Aomi platform via aomi-build",
  },
  args: {
    ...globalArgs,
    "activation-token": {
      type: "string",
      description:
        "Platform activation token (required; or set AOMI_DEPLOY_TOKEN env)",
    },
    "app-source-id": {
      type: "string",
      description:
        "Backend app source ID (required; or set AOMI_APP_SOURCE_ID env)",
    },
    "dry-run": {
      type: "boolean",
      description: "Preview the deployment manifest without applying it",
    },
    branch: {
      type: "string",
      description:
        "Git branch to deploy (default: current branch via git rev-parse)",
    },
    commit: {
      type: "string",
      description: "Deploy a specific commit SHA instead of a branch tip",
    },
    "aomi-toml-paths": {
      type: "string",
      description:
        "Comma-separated paths to aomi.toml files (default: aomi.toml)",
    },
    platform: {
      type: "string",
      description:
        "Deploy platform (default: community; or set AOMI_DEPLOY_PLATFORM env)",
    },
  },
  async run({ args }) {
    const { deployCommand } = await import("../deploy");
    await deployCommand(args);
  },
});
