// =============================================================================
// CLI Session State Persistence
// =============================================================================
//
// Stores session state between CLI invocations in a temp JSON file.
// Each `aomi chat` call reads/writes this file to reuse the same session.

import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

export type CliSessionState = {
  sessionId: string;
  baseUrl: string;
  namespace?: string;
  apiKey?: string;
};

const STATE_FILE = join(
  process.env.XDG_RUNTIME_DIR ?? tmpdir(),
  "aomi-session.json",
);

export function readState(): CliSessionState | null {
  try {
    if (!existsSync(STATE_FILE)) return null;
    const raw = readFileSync(STATE_FILE, "utf-8");
    return JSON.parse(raw) as CliSessionState;
  } catch {
    return null;
  }
}

export function writeState(state: CliSessionState): void {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function clearState(): void {
  try {
    if (existsSync(STATE_FILE)) unlinkSync(STATE_FILE);
  } catch {
    // Ignore errors on cleanup
  }
}
