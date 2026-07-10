import { defineCommand } from "citty";
import { buildCliConfig, globalArgs } from "./shared";

const accountLinksDef = defineCommand({
  meta: {
    name: "links",
    description: "List account login methods and linked wallets",
  },
  args: { ...globalArgs },
  async run({ args }) {
    const { accountLinksCommand } = await import("../account");
    await accountLinksCommand(buildCliConfig(args));
  },
});

const accountLinkDef = defineCommand({
  meta: {
    name: "link",
    description: "Link a wallet or provider login method to the account",
  },
  args: {
    ...globalArgs,
    provider: {
      type: "string",
      description: 'Provider login method to link ("privy" or "para")',
    },
    wallet: {
      type: "boolean",
      description: "Link an EVM wallet with SIWE (default)",
    },
    label: {
      type: "string",
      description: "Optional display label for the linked wallet",
    },
  },
  async run({ args }) {
    const { accountLinkCommand } = await import("../account");
    await accountLinkCommand(buildCliConfig(args), {
      provider: typeof args.provider === "string" ? args.provider : undefined,
      wallet: args.wallet === true,
      label: typeof args.label === "string" ? args.label : undefined,
    });
  },
});

const accountUnlinkDef = defineCommand({
  meta: {
    name: "unlink",
    description: "Unlink an account login method or linked wallet",
  },
  args: {
    ...globalArgs,
    id: {
      type: "positional",
      description: "Link id, identity:<id>, or wallet:<id>",
      required: true,
    },
    yes: {
      type: "boolean",
      description: "Confirm unlinking",
    },
  },
  async run({ args }) {
    const { accountUnlinkCommand } = await import("../account");
    await accountUnlinkCommand(buildCliConfig(args), args.id, {
      yes: args.yes === true,
    });
  },
});

const accountRenameDef = defineCommand({
  meta: {
    name: "rename",
    description: "Rename an account login method or linked wallet",
  },
  args: {
    ...globalArgs,
    id: {
      type: "positional",
      description: "Link id, identity:<id>, or wallet:<id>",
      required: true,
    },
    label: {
      type: "string",
      description: "Display label",
      required: true,
    },
  },
  async run({ args }) {
    const { accountRenameCommand } = await import("../account");
    await accountRenameCommand(buildCliConfig(args), args.id, {
      label: typeof args.label === "string" ? args.label : undefined,
    });
  },
});

const accountUpdateDef = defineCommand({
  meta: {
    name: "update",
    description: "Update the account profile",
  },
  args: {
    ...globalArgs,
    "display-name": {
      type: "string",
      description: "Display name",
    },
    "avatar-url": {
      type: "string",
      description: "Avatar URL",
    },
  },
  async run({ args }) {
    const { accountUpdateCommand } = await import("../account");
    await accountUpdateCommand(buildCliConfig(args), {
      displayName:
        typeof args["display-name"] === "string"
          ? args["display-name"]
          : undefined,
      avatarUrl:
        typeof args["avatar-url"] === "string" ? args["avatar-url"] : undefined,
    });
  },
});

const accountDeleteDef = defineCommand({
  meta: {
    name: "delete",
    description: "Delete the Aomi account",
  },
  args: {
    ...globalArgs,
    yes: {
      type: "boolean",
      description: "Confirm account deletion",
    },
  },
  async run({ args }) {
    const { accountDeleteCommand } = await import("../account");
    await accountDeleteCommand(buildCliConfig(args), {
      yes: args.yes === true,
    });
  },
});

export const accountDef = defineCommand({
  meta: { name: "account", description: "Account and link management" },
  args: { ...globalArgs },
  async run({ args, rawArgs }) {
    const firstToken = rawArgs.find((arg) => !arg.startsWith("-"));
    if (firstToken) {
      if (firstToken === "login") {
        const { fatal } = await import("../../errors");
        fatal("Unknown account command `login`. Use `aomi login`.");
      }
      if (firstToken === "whoami") {
        const { fatal } = await import("../../errors");
        fatal("Unknown account command `whoami`. Use `aomi account`.");
      }
      if (firstToken === "logout") {
        const { fatal } = await import("../../errors");
        fatal("Unknown account command `logout`. Use `aomi logout`.");
      }
      return;
    }
    const { accountWhoamiCommand } = await import("../account");
    await accountWhoamiCommand(buildCliConfig(args));
  },
  subCommands: {
    links: accountLinksDef,
    link: accountLinkDef,
    unlink: accountUnlinkDef,
    rename: accountRenameDef,
    update: accountUpdateDef,
    delete: accountDeleteDef,
  },
});
