import { defineCommand } from "citty";
import { globalArgs, toCliRuntime } from "./shared";

const txListDef = defineCommand({
  meta: { name: "list", description: "List pending and signed transactions" },
  args: {},
  async run() {
    const { txCommand } = await import("../wallet");
    txCommand();
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
  async run() {
    const { simulateCommand } = await import("../simulate");
    await simulateCommand(toCliRuntime());
  },
});

const txSignDef = defineCommand({
  meta: { name: "sign", description: "Sign and submit pending transactions" },
  args: {
    ...globalArgs,
    eoa: {
      type: "boolean",
      description: "Force plain EOA execution",
    },
    aa: {
      type: "boolean",
      description: "Require account-abstraction execution with no EOA fallback",
    },
    "aa-provider": {
      type: "string",
      description: "AA provider: alchemy | pimlico",
    },
    "aa-mode": {
      type: "string",
      description: "AA mode: 4337 | 7702",
    },
    txIds: {
      type: "positional",
      description: "Transaction IDs to sign",
      required: false,
    },
  },
  async run() {
    const { signCommand } = await import("../wallet");
    await signCommand(toCliRuntime());
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
