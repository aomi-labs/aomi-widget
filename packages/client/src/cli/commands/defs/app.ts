import { defineCommand } from "citty";
import { globalArgs, buildCliConfig } from "./shared";

const appListDef = defineCommand({
  meta: { name: "list", description: "List available apps" },
  args: { ...globalArgs },
  async run({ args }) {
    const { appsCommand } = await import("../control");
    await appsCommand(buildCliConfig(args));
  },
});

const appCurrentDef = defineCommand({
  meta: { name: "current", description: "Show the current app" },
  args: {},
  async run() {
    const { currentAppCommand } = await import("../control");
    currentAppCommand();
  },
});

export const appDef = defineCommand({
  meta: { name: "app", description: "App management" },
  subCommands: {
    list: appListDef,
    current: appCurrentDef,
  },
});
