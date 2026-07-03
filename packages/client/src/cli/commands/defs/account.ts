import { defineCommand } from "citty";
import { globalArgs, buildCliConfig } from "./shared";

export const accountDef = defineCommand({
  meta: {
    name: "account",
    description:
      "The canonical account — bare `aomi account` shows user info and linked providers",
  },
  args: { ...globalArgs },
  async run({ args }) {
    const { accountShowCommand } = await import("../account");
    await accountShowCommand(buildCliConfig(args));
  },
});
