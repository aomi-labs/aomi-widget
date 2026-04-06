import { getOrCreateSession, ingestSecretsIfPresent } from "../context";
import { fatal } from "../errors";
import { printDataFileLocation } from "../output";
import { readState, writeState } from "../state";
import type { CliRuntime } from "../types";

export async function ingestSecretsCommand(runtime: CliRuntime): Promise<void> {
  if (Object.keys(runtime.config.secrets).length === 0) {
    fatal("Usage: aomi --secret NAME=value [NAME=value ...]");
  }

  const { session, state } = getOrCreateSession(runtime);

  try {
    const handles = await ingestSecretsIfPresent(runtime, state, session.client);
    const names = Object.keys(handles).sort();

    console.log(
      `Configured ${names.length} secret${names.length === 1 ? "" : "s"} for session ${state.sessionId}.`,
    );
    for (const name of names) {
      console.log(`${name}  ${handles[name]}`);
    }
    printDataFileLocation();
  } finally {
    session.close();
  }
}

export async function secretCommand(runtime: CliRuntime): Promise<void> {
  const subcommand = runtime.parsed.positional[0];

  if (!subcommand || subcommand === "list") {
    const state = readState();
    if (!state) {
      console.log("No active session");
      printDataFileLocation();
      return;
    }

    const secretHandles = state.secretHandles ?? {};
    const names = Object.keys(secretHandles).sort();
    if (names.length === 0) {
      console.log("No secrets configured.");
      printDataFileLocation();
      return;
    }

    for (const name of names) {
      console.log(`${name}  ${secretHandles[name]}`);
    }
    printDataFileLocation();
    return;
  }

  if (subcommand === "clear") {
    const { session, state } = getOrCreateSession(runtime);

    try {
      await session.client.clearSecrets(state.clientId);
      state.secretHandles = {};
      writeState(state);
      console.log("Cleared all secrets for the active session.");
      printDataFileLocation();
    } finally {
      session.close();
    }
    return;
  }

  fatal("Usage: aomi secret list\n       aomi secret clear");
}
