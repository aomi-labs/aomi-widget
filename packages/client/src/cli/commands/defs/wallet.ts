import { defineCommand } from "citty";

const walletSetDef = defineCommand({
  meta: { name: "set", description: "Persist a signing key and derived wallet address" },
  args: {
    privateKey: {
      type: "positional",
      description: "Hex private key",
      required: true,
    },
  },
  async run({ args }) {
    const { setWalletCommand } = await import("../preferences");
    setWalletCommand(args.privateKey);
  },
});

const walletCurrentDef = defineCommand({
  meta: { name: "current", description: "Show the configured wallet address" },
  args: {},
  async run() {
    const { currentWalletCommand } = await import("../control");
    currentWalletCommand();
  },
});

export const walletDef = defineCommand({
  meta: { name: "wallet", description: "Wallet configuration" },
  subCommands: {
    set: walletSetDef,
    current: walletCurrentDef,
  },
});
