import { defineCommand } from "citty";
import { globalArgs, toCliRuntime } from "./shared";

export const chatDef = defineCommand({
  meta: { name: "chat", description: "Send a message and print the response" },
  args: {
    ...globalArgs,
    verbose: {
      type: "boolean",
      alias: "v",
      description: "Stream agent responses, tool calls, and events live",
    },
    message: {
      type: "positional",
      description: "Message to send",
      required: false,
    },
  },
  async run() {
    const { chatCommand } = await import("../chat");
    await chatCommand(toCliRuntime());
  },
});
