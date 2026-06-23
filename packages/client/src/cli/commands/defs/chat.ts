import { defineCommand } from "citty";
import { globalArgs, buildCliConfig } from "./shared";

export const chatDef = defineCommand({
  meta: { name: "chat", description: "Send a message and print the response" },
  args: {
    ...globalArgs,
    verbose: {
      type: "boolean",
      alias: "v",
      description: "Stream agent responses, tool calls, and events live",
    },
    "authorized-wallet": {
      type: "string",
      description:
        "Use an authorized wallet for this chat turn (wallet id/ref from `aomi account auth list`)",
    },
    message: {
      type: "positional",
      description: "Message to send",
      required: false,
    },
  },
  async run({ args }) {
    const { chatCommand } = await import("../chat");
    await chatCommand(buildCliConfig(args), args.message ?? "", args.verbose === true, {
      authorizedWalletRef:
        typeof args["authorized-wallet"] === "string"
          ? args["authorized-wallet"]
          : undefined,
    });
  },
});
