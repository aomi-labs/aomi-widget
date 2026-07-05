import { defineCommand } from "citty";
import { globalArgs, buildCliConfig } from "./shared";

const threadListDef = defineCommand({
  meta: { name: "list", description: "List local threads with metadata" },
  args: { ...globalArgs },
  async run({ args }) {
    const { sessionsCommand } = await import("../sessions");
    await sessionsCommand(buildCliConfig(args));
  },
});

const threadNewDef = defineCommand({
  meta: {
    name: "new",
    description: "Start a fresh thread and make it active",
  },
  args: { ...globalArgs },
  async run({ args }) {
    const { newSessionCommand } = await import("../sessions");
    newSessionCommand(buildCliConfig(args));
  },
});

const threadResumeDef = defineCommand({
  meta: { name: "resume", description: "Resume a local thread" },
  args: {
    id: {
      type: "positional",
      description: "Thread ID or thread-N",
      required: true,
    },
  },
  async run({ args }) {
    const { resumeSessionCommand } = await import("../sessions");
    resumeSessionCommand(args.id);
  },
});

const threadDeleteDef = defineCommand({
  meta: { name: "delete", description: "Delete a local thread" },
  args: {
    id: {
      type: "positional",
      description: "Thread ID or thread-N",
      required: true,
    },
  },
  async run({ args }) {
    const { deleteSessionCommand } = await import("../sessions");
    deleteSessionCommand(args.id);
  },
});

const threadStatusDef = defineCommand({
  meta: { name: "status", description: "Show current thread state" },
  args: { ...globalArgs },
  async run({ args }) {
    const { statusCommand } = await import("../control");
    await statusCommand(buildCliConfig(args));
  },
});

const threadLogDef = defineCommand({
  meta: { name: "log", description: "Show conversation history" },
  args: { ...globalArgs },
  async run({ args }) {
    const { logCommand } = await import("../history");
    await logCommand(buildCliConfig(args));
  },
});

const threadEventsDef = defineCommand({
  meta: { name: "events", description: "List system events" },
  args: { ...globalArgs },
  async run({ args }) {
    const { eventsCommand } = await import("../control");
    await eventsCommand(buildCliConfig(args));
  },
});

const threadCloseDef = defineCommand({
  meta: { name: "close", description: "Close the current thread" },
  args: { ...globalArgs },
  async run({ args }) {
    const { closeCommand } = await import("../history");
    closeCommand(buildCliConfig(args));
  },
});

export const threadDef = defineCommand({
  meta: {
    name: "thread",
    description: "Threads — conversations with the agent",
  },
  subCommands: {
    list: threadListDef,
    new: threadNewDef,
    resume: threadResumeDef,
    delete: threadDeleteDef,
    status: threadStatusDef,
    log: threadLogDef,
    events: threadEventsDef,
    close: threadCloseDef,
  },
});
