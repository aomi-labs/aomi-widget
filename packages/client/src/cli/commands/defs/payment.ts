import { defineCommand } from "citty";
import { buildCliConfig, globalArgs } from "./shared";

const paymentStatusDef = defineCommand({
  meta: { name: "status", description: "Show cached payment configuration" },
  args: { ...globalArgs },
  async run({ args }) {
    const { paymentStatusCommand } = await import("../payment");
    await paymentStatusCommand(buildCliConfig(args));
  },
});

const paymentMethodsDef = defineCommand({
  meta: { name: "methods", description: "Show supported chat payment methods" },
  args: {},
  async run() {
    const { paymentMethodsCommand } = await import("../payment");
    paymentMethodsCommand();
  },
});

const paymentByokSetDef = defineCommand({
  meta: { name: "set", description: "Cache a BYOK provider key" },
  args: {
    ...globalArgs,
    provider: {
      type: "positional",
      description: "Provider identifier",
      required: true,
    },
    apiKey: {
      type: "positional",
      description: "Provider API key",
      required: true,
    },
    label: {
      type: "string",
      description: "Optional label",
    },
  },
  async run({ args }) {
    const { paymentByokSetCommand } = await import("../payment");
    await paymentByokSetCommand(
      buildCliConfig(args),
      args.provider,
      args.apiKey,
      args.label,
    );
  },
});

const paymentByokClearDef = defineCommand({
  meta: { name: "clear", description: "Clear a cached BYOK provider key" },
  args: {
    ...globalArgs,
    provider: {
      type: "positional",
      description: "Provider identifier",
      required: true,
    },
  },
  async run({ args }) {
    const { paymentByokClearCommand } = await import("../payment");
    await paymentByokClearCommand(buildCliConfig(args), args.provider);
  },
});

const paymentByokDef = defineCommand({
  meta: { name: "byok", description: "Manage cached BYOK provider keys" },
  subCommands: {
    set: paymentByokSetDef,
    clear: paymentByokClearDef,
  },
});

const paymentTempoSetDef = defineCommand({
  meta: { name: "set", description: "Cache a Tempo / MPP payment channel" },
  args: {
    ...globalArgs,
    channelId: {
      type: "positional",
      description: "Tempo channel id",
      required: true,
    },
    voucher: {
      type: "string",
      description: "Optional voucher blob",
    },
  },
  async run({ args }) {
    const { paymentTempoSetCommand } = await import("../payment");
    await paymentTempoSetCommand(
      buildCliConfig(args),
      args.channelId,
      args.voucher,
    );
  },
});

const paymentTempoClearDef = defineCommand({
  meta: { name: "clear", description: "Clear the cached Tempo / MPP channel" },
  args: { ...globalArgs },
  async run({ args }) {
    const { paymentTempoClearCommand } = await import("../payment");
    await paymentTempoClearCommand(buildCliConfig(args));
  },
});

const paymentTempoDef = defineCommand({
  meta: { name: "tempo", description: "Manage cached Tempo / MPP channels" },
  subCommands: {
    set: paymentTempoSetDef,
    clear: paymentTempoClearDef,
  },
});

export const paymentDef = defineCommand({
  meta: { name: "payment", description: "Payment configuration" },
  subCommands: {
    status: paymentStatusDef,
    methods: paymentMethodsDef,
    byok: paymentByokDef,
    tempo: paymentTempoDef,
  },
});
