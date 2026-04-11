import { defineCommand } from "citty";
import { globalArgs, toCliRuntime } from "./shared";

const sessionListDef = defineCommand({
  meta: { name: "list", description: "List local sessions with metadata" },
  args: {},
  async run() {
    const { sessionsCommand } = await import("../sessions");
    await sessionsCommand(toCliRuntime());
  },
});

const sessionNewDef = defineCommand({
  meta: { name: "new", description: "Start a fresh session and make it active" },
  args: { ...globalArgs },
  async run() {
    const { newSessionCommand } = await import("../sessions");
    newSessionCommand(toCliRuntime());
  },
});

const sessionResumeDef = defineCommand({
  meta: { name: "resume", description: "Resume a local session" },
  args: {
    id: {
      type: "positional",
      description: "Session ID or session-N",
      required: true,
    },
  },
  async run({ args }) {
    const { resumeSessionCommand } = await import("../sessions");
    resumeSessionCommand(args.id);
  },
});

const sessionDeleteDef = defineCommand({
  meta: { name: "delete", description: "Delete a local session" },
  args: {
    id: {
      type: "positional",
      description: "Session ID or session-N",
      required: true,
    },
  },
  async run({ args }) {
    const { deleteSessionCommand } = await import("../sessions");
    deleteSessionCommand(args.id);
  },
});

const sessionStatusDef = defineCommand({
  meta: { name: "status", description: "Show current session state" },
  args: { ...globalArgs },
  async run() {
    const { statusCommand } = await import("../control");
    await statusCommand(toCliRuntime());
  },
});

const sessionLogDef = defineCommand({
  meta: { name: "log", description: "Show conversation history" },
  args: { ...globalArgs },
  async run() {
    const { logCommand } = await import("../history");
    await logCommand(toCliRuntime());
  },
});

const sessionEventsDef = defineCommand({
  meta: { name: "events", description: "List system events" },
  args: { ...globalArgs },
  async run() {
    const { eventsCommand } = await import("../control");
    await eventsCommand(toCliRuntime());
  },
});

const sessionCloseDef = defineCommand({
  meta: { name: "close", description: "Close the current session" },
  args: { ...globalArgs },
  async run() {
    const { closeCommand } = await import("../history");
    closeCommand(toCliRuntime());
  },
});

export const sessionDef = defineCommand({
  meta: { name: "session", description: "Session management" },
  subCommands: {
    list: sessionListDef,
    new: sessionNewDef,
    resume: sessionResumeDef,
    delete: sessionDeleteDef,
    status: sessionStatusDef,
    log: sessionLogDef,
    events: sessionEventsDef,
    close: sessionCloseDef,
  },
});
