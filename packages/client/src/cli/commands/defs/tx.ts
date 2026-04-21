import { defineCommand } from "citty";
import { globalArgs, buildCliConfig, getPositionals } from "./shared";

const txListDef = defineCommand({
  meta: { name: "list", description: "List pending and signed transactions" },
  args: {},
  async run() {
    const { txCommand } = await import("../wallet");
    await txCommand();
  },
});

const txSimulateDef = defineCommand({
  meta: { name: "simulate", description: "Simulate a batch of pending transactions" },
  args: {
    txIds: {
      type: "positional",
      description: "Transaction IDs to simulate",
      required: false,
    },
  },
  async run({ args }) {
    const { simulateCommand } = await import("../simulate");
    const txIds = getPositionals(args);
    await simulateCommand(txIds);
  },
});

const txSignDef = defineCommand({
  meta: { name: "sign", description: "Sign and submit pending transactions" },
  args: {
    ...globalArgs,
    eoa: {
      type: "boolean",
      description: "Force plain EOA execution, skip AA even if configured",
    },
    aa: {
      type: "boolean",
      description: "Force AA execution, error if provider not configured (default: auto-detect)",
    },
    "aa-provider": {
      type: "string",
      description: "AA provider override: alchemy | pimlico",
    },
    "aa-mode": {
      type: "string",
      description: "AA mode override: 4337 | 7702",
    },
    txIds: {
      type: "positional",
      description: "Transaction IDs to sign",
      required: false,
    },
  },
  async run({ args }) {
    const { signCommand } = await import("../wallet");
    const txIds = getPositionals(args);
    await signCommand(buildCliConfig(args), txIds);
  },
});

export const txDef = defineCommand({
  meta: { name: "tx", description: "Transaction management" },
  subCommands: {
    list: txListDef,
    simulate: txSimulateDef,
    sign: txSignDef,
  },
});
