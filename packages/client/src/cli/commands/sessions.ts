import { AomiClient } from "../../client";
import { fatal } from "../errors";
import { RESET, YELLOW, printDataFileLocation } from "../output";
import {
  deleteStoredSession,
  listStoredSessions,
  readState,
  setActiveSession,
  type StoredSessionRecord,
} from "../state";
import {
  estimateTokenCount,
  printKeyValueTable,
  printTransactionTable,
} from "../tables";
import type { CliRuntime } from "../types";

type RemoteSessionStats = {
  topic: string;
  messageCount: number;
  tokenCountEstimate: number;
  toolCalls: number;
};

async function fetchRemoteSessionStats(
  record: StoredSessionRecord,
): Promise<RemoteSessionStats | null> {
  const client = new AomiClient({
    baseUrl: record.state.baseUrl,
    apiKey: record.state.apiKey,
  });

  try {
    const apiState = await client.fetchState(record.sessionId);
    const messages = apiState.messages ?? [];
    return {
      topic: apiState.title ?? "Untitled Session",
      messageCount: messages.length,
      tokenCountEstimate: estimateTokenCount(messages),
      toolCalls: messages.filter((msg) => Boolean(msg.tool_result)).length,
    };
  } catch {
    return null;
  }
}

function printSessionSummary(
  record: StoredSessionRecord,
  stats: RemoteSessionStats | null,
  isActive: boolean,
): void {
  const pendingTxs = record.state.pendingTxs ?? [];
  const signedTxs = record.state.signedTxs ?? [];
  const header = isActive
    ? `🧵 Session id: ${record.sessionId} (session-${record.localId}, active)`
    : `🧵 Session id: ${record.sessionId} (session-${record.localId})`;

  console.log(`${YELLOW}------ ${header} ------${RESET}`);
  printKeyValueTable([
    ["🧠 topic", stats?.topic ?? "Unavailable (fetch failed)"],
    ["💬 msg count", stats ? String(stats.messageCount) : "n/a"],
    [
      "🧮 token count",
      stats ? `${stats.tokenCountEstimate} (estimated)` : "n/a",
    ],
    ["🛠 tool calls", stats ? String(stats.toolCalls) : "n/a"],
    [
      "💸 transactions",
      `${pendingTxs.length + signedTxs.length} (${pendingTxs.length} pending, ${signedTxs.length} signed)`,
    ],
  ]);

  console.log();
  console.log(`${YELLOW}💾 Transactions metadata (JSON):${RESET}`);
  printTransactionTable(pendingTxs, signedTxs);
}

export async function sessionsCommand(_runtime: CliRuntime): Promise<void> {
  const sessions = listStoredSessions().sort((a, b) => b.updatedAt - a.updatedAt);
  if (sessions.length === 0) {
    console.log("No local sessions.");
    printDataFileLocation();
    return;
  }

  const activeSessionId = readState()?.sessionId;

  const statsResults = await Promise.all(
    sessions.map((record) => fetchRemoteSessionStats(record)),
  );

  for (let i = 0; i < sessions.length; i++) {
    printSessionSummary(
      sessions[i],
      statsResults[i],
      sessions[i].sessionId === activeSessionId,
    );
    if (i < sessions.length - 1) {
      console.log();
    }
  }

  printDataFileLocation();
}

export async function sessionCommand(runtime: CliRuntime): Promise<void> {
  const subcommand = runtime.parsed.positional[0];
  const selector = runtime.parsed.positional[1];

  if (subcommand === "resume") {
    if (!selector) {
      fatal("Usage: aomi session resume <session-id|session-N|N>");
    }
    const resumed = setActiveSession(selector);
    if (!resumed) {
      fatal(`No local session found for selector \"${selector}\".`);
    }
    console.log(`Active session set to ${resumed.sessionId} (session-${resumed.localId}).`);
    printDataFileLocation();
    return;
  }

  if (subcommand === "delete") {
    if (!selector) {
      fatal("Usage: aomi session delete <session-id|session-N|N>");
    }
    const deleted = deleteStoredSession(selector);
    if (!deleted) {
      fatal(`No local session found for selector \"${selector}\".`);
    }
    console.log(`Deleted local session ${deleted.sessionId} (session-${deleted.localId}).`);
    const active = readState();
    if (active) {
      console.log(`Active session: ${active.sessionId}`);
    } else {
      console.log("No active session");
    }
    printDataFileLocation();
    return;
  }

  if (subcommand === "list") {
    await sessionsCommand(runtime);
    return;
  }

  fatal(
    "Usage: aomi session list\n       aomi session resume <session-id|session-N|N>\n       aomi session delete <session-id|session-N|N>",
  );
}
