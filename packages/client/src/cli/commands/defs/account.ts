import { defineCommand } from "citty";
import { globalArgs, buildCliConfig } from "./shared";

const ACCOUNT_SUBCOMMANDS = new Set(["login", "whoami"]);

const accountLoginDef = defineCommand({
  meta: {
    name: "login",
    description: "(deprecated) use `aomi login` — BetterAuth/BFF device flow",
  },
  args: { ...globalArgs },
  async run({ args }) {
    console.error("`aomi account login` is deprecated — use `aomi login`.");
    const { loginCommand } = await import("../account");
    await loginCommand(buildCliConfig(args));
  },
});

const accountWhoamiDef = defineCommand({
  meta: {
    name: "whoami",
    description: "(deprecated) use bare `aomi account`",
    hidden: true,
  },
  args: { ...globalArgs },
  async run({ args }) {
    const { accountShowCommand } = await import("../account");
    await accountShowCommand(buildCliConfig(args));
  },
});

export const accountDef = defineCommand({
  meta: {
    name: "account",
    description:
      "The canonical account — bare `aomi account` shows user info and linked providers",
  },
  args: { ...globalArgs },
  async run({ args, rawArgs }) {
    // citty 0.2.2 quirk (see root.ts): when a subCommand is matched, the
    // parent `run` still fires afterwards. Bail so `aomi account login` does
    // not also print the account view.
    const firstToken = rawArgs.find((arg) => !arg.startsWith("-"));
    if (firstToken && ACCOUNT_SUBCOMMANDS.has(firstToken)) {
      return;
    }
    const { accountShowCommand } = await import("../account");
    await accountShowCommand(buildCliConfig(args));
  },
  subCommands: {
    login: accountLoginDef,
    whoami: accountWhoamiDef,
  },
});
