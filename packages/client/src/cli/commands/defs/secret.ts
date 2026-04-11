import { defineCommand } from "citty";
import { globalArgs, toCliRuntime } from "./shared";

const secretListDef = defineCommand({
  meta: { name: "list", description: "List configured secrets for the active session" },
  args: {},
  async run() {
    const { listSecretsCommand } = await import("../secrets");
    listSecretsCommand();
  },
});

const secretClearDef = defineCommand({
  meta: { name: "clear", description: "Clear all secrets for the active session" },
  args: { ...globalArgs },
  async run() {
    const { clearSecretsCommand } = await import("../secrets");
    await clearSecretsCommand(toCliRuntime());
  },
});

const secretAddDef = defineCommand({
  meta: { name: "add", description: "Add a secret (NAME=value)" },
  args: {
    ...globalArgs,
    secret: {
      type: "positional",
      description: "Secret in NAME=value format",
      required: true,
    },
  },
  async run({ args }) {
    const { ingestSecretsCommand } = await import("../secrets");
    const runtime = toCliRuntime();
    const eqIdx = args.secret.indexOf("=");
    if (eqIdx > 0) {
      runtime.config.secrets[args.secret.slice(0, eqIdx)] = args.secret.slice(eqIdx + 1);
    }
    await ingestSecretsCommand(runtime);
  },
});

export const secretDef = defineCommand({
  meta: { name: "secret", description: "Secret management" },
  subCommands: {
    list: secretListDef,
    clear: secretClearDef,
    add: secretAddDef,
  },
});
