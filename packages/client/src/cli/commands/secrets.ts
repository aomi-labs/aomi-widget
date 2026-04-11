import {
  ingestSecretsIfPresent,
  getOrCreateSession,
} from "../context";
import { fatal } from "../errors";
import { printDataFileLocation } from "../output";
import { readState, writeState } from "../state";
import type { CliConfig } from "../types";

export async function ingestSecretsCommand(config: CliConfig): Promise<void> {
  const secretEntries = Object.entries(config.secrets);
  if (secretEntries.length === 0) {
    fatal("Usage: aomi secret add NAME=value [NAME=value ...]");
  }

  const { session, state } = getOrCreateSession(config, {
    fresh: config.freshSession,
  });

  try {
    const handles = await ingestSecretsIfPresent(
      config,
      state,
      session.client,
    );
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

export function listSecretsCommand(): void {
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
}

export async function clearSecretsCommand(config: CliConfig): Promise<void> {
  const { session, state } = getOrCreateSession(config);
  try {
    if (!state.clientId) {
      console.log("No secrets configured.");
      printDataFileLocation();
      return;
    }
    await session.client.clearSecrets(state.clientId);
    state.secretHandles = {};
    writeState(state);
    console.log("Cleared all secrets for the active session.");
    printDataFileLocation();
  } finally {
    session.close();
  }
}
