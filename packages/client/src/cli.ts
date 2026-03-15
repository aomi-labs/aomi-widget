// =============================================================================
// Aomi CLI
// =============================================================================
//
// Minimal CLI for interacting with the Aomi backend.
// Designed for scripting, bots, and Claude Code skills.
//
// Usage:
//   aomi chat "swap 1 ETH for USDC"
//   aomi tx                          # list pending + signed txs
//   aomi sign <tx-id>                # sign a specific pending tx
//   aomi status
//   aomi events
//   aomi close

import { Session } from "./session";
import type { WalletRequest } from "./session";
import type { WalletTxPayload, WalletEip712Payload } from "./wallet-utils";
import type { AomiMessage, AomiSSEEvent } from "./types";
import {
  readState,
  writeState,
  clearState,
  addPendingTx,
  removePendingTx,
  addSignedTx,
  STATE_FILE,
  type CliSessionState,
  type PendingTx,
} from "./cli-state";

// =============================================================================
// Error Handling
// =============================================================================

class CliExit extends Error {
  constructor(public code: number) {
    super();
  }
}

function fatal(message: string): never {
  console.error(message);
  throw new CliExit(1);
}

function printDataFileLocation(): void {
  console.log(`Data stored at ${STATE_FILE} 📝`);
}

// =============================================================================
// Argument Parsing
// =============================================================================

type ParsedArgs = {
  command: string | undefined;
  positional: string[];
  flags: Record<string, string>;
};

function parseArgs(argv: string[]): ParsedArgs {
  const raw = argv.slice(2);
  const command = raw[0] && !raw[0].startsWith("--") ? raw[0] : undefined;
  const rest = command ? raw.slice(1) : raw;

  const positional: string[] = [];
  const flags: Record<string, string> = {};

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg.startsWith("--") && arg.includes("=")) {
      const [key, ...val] = arg.slice(2).split("=");
      flags[key] = val.join("=");
    } else if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = rest[i + 1];
      if (next && !next.startsWith("-")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = "true";
      }
    } else if (arg.startsWith("-") && arg.length === 2) {
      // Short boolean flag like -v
      flags[arg.slice(1)] = "true";
    } else {
      positional.push(arg);
    }
  }

  return { command, positional, flags };
}

const parsed = parseArgs(process.argv);

function getConfig() {
  return {
    baseUrl:
      parsed.flags["backend-url"] ??
      process.env.AOMI_BASE_URL ??
      "https://api.aomi.dev",
    apiKey:
      parsed.flags["api-key"] ??
      process.env.AOMI_API_KEY,
    namespace:
      parsed.flags["namespace"] ??
      process.env.AOMI_NAMESPACE ??
      "default",
    publicKey:
      parsed.flags["public-key"] ??
      process.env.AOMI_PUBLIC_KEY,
    privateKey:
      parsed.flags["private-key"] ??
      process.env.PRIVATE_KEY,
    chainRpcUrl:
      parsed.flags["rpc-url"] ??
      process.env.CHAIN_RPC_URL,
  };
}

function getOrCreateSession(): { session: Session; state: CliSessionState } {
  const config = getConfig();

  let state = readState();
  if (!state) {
    state = {
      sessionId: crypto.randomUUID(),
      baseUrl: config.baseUrl,
      namespace: config.namespace,
      apiKey: config.apiKey,
      publicKey: config.publicKey,
    };
    writeState(state);
  } else {
    // Merge current CLI flags over persisted state (flags take priority)
    let changed = false;
    if (config.baseUrl && config.baseUrl !== state.baseUrl) {
      state.baseUrl = config.baseUrl;
      changed = true;
    }
    if (config.namespace && config.namespace !== state.namespace) {
      state.namespace = config.namespace;
      changed = true;
    }
    if (config.apiKey !== undefined && config.apiKey !== state.apiKey) {
      state.apiKey = config.apiKey;
      changed = true;
    }
    if (config.publicKey !== undefined && config.publicKey !== state.publicKey) {
      state.publicKey = config.publicKey;
      changed = true;
    }
    if (changed) writeState(state);
  }

  const session = new Session(
    { baseUrl: state.baseUrl, apiKey: state.apiKey },
    {
      sessionId: state.sessionId,
      namespace: state.namespace,
      apiKey: state.apiKey,
      publicKey: state.publicKey,
      userState: state.publicKey
        ? {
            address: state.publicKey,
            chainId: 1,
            isConnected: true,
          }
        : undefined,
    },
  );

  return { session, state };
}

// =============================================================================
// Helpers
// =============================================================================

/** Convert a WalletRequest from Session into a PendingTx for the state file. */
function walletRequestToPendingTx(req: WalletRequest): Omit<PendingTx, "id"> {
  if (req.kind === "transaction") {
    const p = req.payload as WalletTxPayload;
    return {
      kind: "transaction",
      to: p.to,
      value: p.value,
      data: p.data,
      chainId: p.chainId,
      timestamp: req.timestamp,
      payload: req.payload as unknown as Record<string, unknown>,
    };
  }
  const p = req.payload as WalletEip712Payload;
  return {
    kind: "eip712_sign",
    description: p.description,
    timestamp: req.timestamp,
    payload: req.payload as unknown as Record<string, unknown>,
  };
}

function formatTxLine(tx: PendingTx, prefix: string): string {
  const parts = [`${prefix} ${tx.id}`];
  if (tx.kind === "transaction") {
    parts.push(`to: ${tx.to ?? "?"}`);
    if (tx.value) parts.push(`value: ${tx.value}`);
    if (tx.chainId) parts.push(`chain: ${tx.chainId}`);
    if (tx.data) parts.push(`data: ${tx.data.slice(0, 20)}...`);
  } else {
    parts.push(`eip712`);
    if (tx.description) parts.push(tx.description);
  }
  parts.push(`(${new Date(tx.timestamp).toLocaleTimeString()})`);
  return parts.join("  ");
}

// =============================================================================
// Verbose Output Helpers
// =============================================================================

const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const RESET = "\x1b[0m";

function printToolUpdate(event: AomiSSEEvent): void {
  const name =
    (event.tool_name as string | undefined) ??
    (event.name as string | undefined) ??
    "unknown";
  const status =
    (event.status as string | undefined) ?? "running";
  console.log(`${DIM}🔧 [tool] ${name}: ${status}${RESET}`);
}

function printToolComplete(event: AomiSSEEvent): void {
  const name =
    (event.tool_name as string | undefined) ??
    (event.name as string | undefined) ??
    "unknown";
  const result =
    (event.result as string | undefined) ??
    (event.output as string | undefined);
  const line = result
    ? `${GREEN}✔ [tool] ${name} → ${result.slice(0, 120)}${result.length > 120 ? "…" : ""}${RESET}`
    : `${GREEN}✔ [tool] ${name} done${RESET}`;
  console.log(line);
}

/**
 * Prints agent messages we haven't shown yet, skipping ones still streaming.
 * Returns the count of agent messages we've handled (printed or pre-existing).
 * Streaming messages are NOT counted — they'll be re-checked on next poll.
 */
function printNewAgentMessages(
  messages: AomiMessage[],
  lastPrintedCount: number,
): number {
  const agentMessages = messages.filter(
    (m) => m.sender === "agent" || m.sender === "assistant",
  );
  let handled = lastPrintedCount;
  for (let i = lastPrintedCount; i < agentMessages.length; i++) {
    const msg = agentMessages[i];
    if (msg.is_streaming) {
      // Still streaming — don't advance the counter so we re-check next time
      break;
    }
    if (msg.content) {
      console.log(`${CYAN}🤖 ${msg.content}${RESET}`);
    }
    handled = i + 1;
  }
  return handled;
}

// =============================================================================
// Commands
// =============================================================================

async function chatCommand(): Promise<void> {
  const message = parsed.positional.join(" ");
  if (!message) {
    fatal("Usage: aomi chat <message>");
  }

  const verbose = parsed.flags["verbose"] === "true" || parsed.flags["v"] === "true";

  const { session, state } = getOrCreateSession();

  // If we have a public key, tell the backend the wallet is "connected"
  if (state.publicKey) {
    await session.client.sendSystemMessage(
      session.sessionId,
      JSON.stringify({
        type: "wallet:state_changed",
        payload: {
          address: state.publicKey,
          chainId: 1,
          isConnected: true,
        },
      }),
    );
  }

  // Use sendAsync — we need to exit early if a wallet request arrives
  // (send() would block forever waiting for the wallet request to be resolved)
  const capturedRequests: WalletRequest[] = [];
  let printedAgentCount = 0;

  session.on("wallet_tx_request", (req) => capturedRequests.push(req));
  session.on("wallet_eip712_request", (req) => capturedRequests.push(req));

  try {
    await session.sendAsync(message);

    // After sendAsync, _messages includes the full conversation.
    // We want to only print agent messages that arrive AFTER our send.
    // Find the last occurrence of our user message and count agent messages before it.
    const allMsgs = session.getMessages();
    let seedIdx = allMsgs.length;
    for (let i = allMsgs.length - 1; i >= 0; i--) {
      if (allMsgs[i].sender === "user") {
        seedIdx = i;
        break;
      }
    }
    // Count agent messages that appeared before our user message (historical)
    printedAgentCount = allMsgs.slice(0, seedIdx).filter(
      (m) => m.sender === "agent" || m.sender === "assistant",
    ).length;

    // Verbose mode: stream tool events and agent messages in real-time
    if (verbose) {
      if (session.getIsProcessing()) {
        console.log(`${DIM}⏳ Processing…${RESET}`);
      }
      // Print any agent messages already in the send response
      printedAgentCount = printNewAgentMessages(allMsgs, printedAgentCount);

      session.on("tool_update", (event) => printToolUpdate(event));
      session.on("tool_complete", (event) => printToolComplete(event));
      session.on("messages", (msgs) => {
        printedAgentCount = printNewAgentMessages(msgs, printedAgentCount);
      });
      session.on("system_notice", ({ message: msg }) => {
        console.log(`${YELLOW}📢 ${msg}${RESET}`);
      });
      session.on("system_error", ({ message: msg }) => {
        console.log(`\x1b[31m❌ ${msg}${RESET}`);
      });
    }

    // Wait for either: processing ends, or a wallet request arrives
    if (session.getIsProcessing()) {
      await new Promise<void>((resolve) => {
        const checkWallet = () => {
          if (capturedRequests.length > 0) resolve();
        };
        session.on("wallet_tx_request", checkWallet);
        session.on("wallet_eip712_request", checkWallet);
        session.on("processing_end", () => resolve());
      });
    }

    // Final flush — print any remaining agent messages not yet shown
    if (verbose) {
      printNewAgentMessages(session.getMessages(), printedAgentCount);
      console.log(`${DIM}✅ Done${RESET}`);
    }

    // Persist any wallet requests that arrived
    for (const req of capturedRequests) {
      const pending = addPendingTx(state, walletRequestToPendingTx(req));
      console.log(`⚡ Wallet request queued: ${pending.id}`);
      if (req.kind === "transaction") {
        const p = req.payload as WalletTxPayload;
        console.log(`   to:    ${p.to}`);
        if (p.value) console.log(`   value: ${p.value}`);
        if (p.chainId) console.log(`   chain: ${p.chainId}`);
      } else {
        const p = req.payload as WalletEip712Payload;
        if (p.description) console.log(`   desc:  ${p.description}`);
      }
    }

    // In verbose mode we've already streamed messages; in normal mode print last
    if (!verbose) {
      const messages = session.getMessages();
      const agentMessages = messages.filter(
        (m) => m.sender === "agent" || m.sender === "assistant",
      );
      const last = agentMessages[agentMessages.length - 1];

      if (last?.content) {
        console.log(last.content);
      } else if (capturedRequests.length === 0) {
        console.log("(no response)");
      }
    }

    if (capturedRequests.length > 0) {
      console.log(`\nRun \`aomi tx\` to see pending transactions, \`aomi sign <id>\` to sign.`);
    }
  } finally {
    session.close();
  }
}

async function statusCommand(): Promise<void> {
  const state = readState();
  if (!state) {
    console.log("No active session");
    printDataFileLocation();
    return;
  }

  const { session } = getOrCreateSession();

  try {
    const apiState = await session.client.fetchState(state.sessionId);
    console.log(
      JSON.stringify(
        {
          sessionId: state.sessionId,
          baseUrl: state.baseUrl,
          namespace: state.namespace,
          isProcessing: apiState.is_processing ?? false,
          messageCount: apiState.messages?.length ?? 0,
          title: apiState.title ?? null,
          pendingTxs: state.pendingTxs?.length ?? 0,
          signedTxs: state.signedTxs?.length ?? 0,
        },
        null,
        2,
      ),
    );
    printDataFileLocation();
  } finally {
    session.close();
  }
}

async function eventsCommand(): Promise<void> {
  const state = readState();
  if (!state) {
    console.log("No active session");
    return;
  }

  const { session } = getOrCreateSession();

  try {
    const events = await session.client.getSystemEvents(state.sessionId);
    console.log(JSON.stringify(events, null, 2));
  } finally {
    session.close();
  }
}

function txCommand(): void {
  const state = readState();
  if (!state) {
    console.log("No active session");
    printDataFileLocation();
    return;
  }

  const pending = state.pendingTxs ?? [];
  const signed = state.signedTxs ?? [];

  if (pending.length === 0 && signed.length === 0) {
    console.log("No transactions.");
    printDataFileLocation();
    return;
  }

  if (pending.length > 0) {
    console.log(`Pending (${pending.length}):`);
    for (const tx of pending) {
      console.log(formatTxLine(tx, "  ⏳"));
    }
  }

  if (signed.length > 0) {
    if (pending.length > 0) console.log();
    console.log(`Signed (${signed.length}):`);
    for (const tx of signed) {
      const parts = [`  ✅ ${tx.id}`];
      if (tx.kind === "eip712_sign") {
        parts.push(`sig: ${tx.signature?.slice(0, 20)}...`);
        if (tx.description) parts.push(tx.description);
      } else {
        parts.push(`hash: ${tx.txHash}`);
        if (tx.to) parts.push(`to: ${tx.to}`);
        if (tx.value) parts.push(`value: ${tx.value}`);
      }
      parts.push(`(${new Date(tx.timestamp).toLocaleTimeString()})`);
      console.log(parts.join("  "));
    }
  }

  printDataFileLocation();
}

async function signCommand(): Promise<void> {
  const txId = parsed.positional[0];
  if (!txId) {
    fatal("Usage: aomi sign <tx-id>\nRun `aomi tx` to see pending transaction IDs.");
  }

  const config = getConfig();
  const privateKey = config.privateKey;
  if (!privateKey) {
    fatal("Private key required. Pass --private-key or set PRIVATE_KEY env var.");
  }

  const state = readState();
  if (!state) {
    fatal("No active session. Run `aomi chat` first.");
  }

  // Find the pending tx
  const pendingTx = (state.pendingTxs ?? []).find((t) => t.id === txId);
  if (!pendingTx) {
    fatal(`No pending transaction with id "${txId}".\nRun \`aomi tx\` to see available IDs.`);
  }

  const { session } = getOrCreateSession();

  try {
    // Dynamic import — viem is an optional peer dep
    let viem: typeof import("viem");
    let viemAccounts: typeof import("viem/accounts");
    let viemChains: typeof import("viem/chains");
    try {
      viem = await import("viem");
      viemAccounts = await import("viem/accounts");
      viemChains = await import("viem/chains");
    } catch {
      fatal(
        "viem is required for `aomi sign`. Install it:\n  npm install viem\n  # or: pnpm add viem",
      );
    }

    const { createWalletClient, http } = viem;
    const { privateKeyToAccount } = viemAccounts;

    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const rpcUrl = config.chainRpcUrl;

    // Resolve chain from pendingTx.chainId — fall back to mainnet
    const targetChainId = pendingTx.chainId ?? 1;
    const chain =
      Object.values(viemChains).find(
        (c): c is import("viem").Chain =>
          typeof c === "object" && c !== null && "id" in c && (c as { id: number }).id === targetChainId,
      ) ?? { id: targetChainId, name: `Chain ${targetChainId}`, nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [rpcUrl ?? ""] } } };

    const walletClient = createWalletClient({
      account,
      chain: chain as import("viem").Chain,
      transport: http(rpcUrl),
    });

    console.log(`Signer:  ${account.address}`);
    console.log(`ID:      ${pendingTx.id}`);
    console.log(`Kind:    ${pendingTx.kind}`);

    if (pendingTx.kind === "transaction") {
      // -----------------------------------------------------------------------
      // Sign + send a transaction
      // -----------------------------------------------------------------------
      console.log(`To:      ${pendingTx.to}`);
      if (pendingTx.value) console.log(`Value:   ${pendingTx.value}`);
      if (pendingTx.chainId) console.log(`Chain:   ${pendingTx.chainId}`);
      if (pendingTx.data) console.log(`Data:    ${pendingTx.data.slice(0, 40)}...`);
      console.log();

      const hash = await walletClient.sendTransaction({
        to: pendingTx.to as `0x${string}`,
        value: pendingTx.value ? BigInt(pendingTx.value) : 0n,
        data: (pendingTx.data as `0x${string}`) ?? undefined,
      });

      console.log(`✅ Sent! Hash: ${hash}`);

      // Move from pending → signed
      removePendingTx(state, txId);
      const freshState = readState()!;
      addSignedTx(freshState, {
        id: txId,
        kind: "transaction",
        txHash: hash,
        from: account.address,
        to: pendingTx.to,
        value: pendingTx.value,
        chainId: pendingTx.chainId,
        timestamp: Date.now(),
      });

      // Notify backend
      await session.client.sendSystemMessage(
        state.sessionId,
        JSON.stringify({
          type: "wallet:tx_complete",
          payload: { txHash: hash, status: "success" },
        }),
      );
    } else {
      // -----------------------------------------------------------------------
      // EIP-712 typed data signature
      // -----------------------------------------------------------------------
      const typedData = pendingTx.payload.typed_data as {
        domain?: Record<string, unknown>;
        types?: Record<string, Array<{ name: string; type: string }>>;
        primaryType?: string;
        message?: Record<string, unknown>;
      } | undefined;

      if (!typedData) {
        fatal("EIP-712 request is missing typed_data payload.");
      }

      if (pendingTx.description) console.log(`Desc:    ${pendingTx.description}`);
      if (typedData.primaryType) console.log(`Type:    ${typedData.primaryType}`);
      console.log();

      // viem signTypedData expects specific shape
      const { domain, types, primaryType, message } = typedData;

      // Remove EIP712Domain from types if present (viem adds it automatically)
      const sigTypes = { ...types };
      delete sigTypes["EIP712Domain"];

      const signature = await walletClient.signTypedData({
        domain: domain as Record<string, unknown>,
        types: sigTypes as Record<string, Array<{ name: string; type: string }>>,
        primaryType: primaryType as string,
        message: message as Record<string, unknown>,
      });

      console.log(`✅ Signed! Signature: ${signature.slice(0, 20)}...`);

      // Move from pending → signed
      removePendingTx(state, txId);
      const freshState = readState()!;
      addSignedTx(freshState, {
        id: txId,
        kind: "eip712_sign",
        signature,
        from: account.address,
        description: pendingTx.description,
        timestamp: Date.now(),
      });

      // Notify backend
      await session.client.sendSystemMessage(
        state.sessionId,
        JSON.stringify({
          type: "wallet_eip712_response",
          payload: {
            status: "success",
            signature,
            description: pendingTx.description,
          },
        }),
      );
    }

    console.log("Backend notified.");
  } catch (err) {
    if (err instanceof CliExit) throw err;
    const errMsg = err instanceof Error ? err.message : String(err);
    fatal(`❌ Signing failed: ${errMsg}`);
  } finally {
    session.close();
  }
}

async function logCommand(): Promise<void> {
  const state = readState();
  if (!state) {
    console.log("No active session");
    printDataFileLocation();
    return;
  }

  const { session } = getOrCreateSession();

  try {
    const apiState = await session.client.fetchState(state.sessionId);
    const messages = apiState.messages ?? [];

    if (messages.length === 0) {
      console.log("No messages in this session.");
      printDataFileLocation();
      return;
    }

    for (const msg of messages) {
      let time = "";
      if (msg.timestamp) {
        const raw = msg.timestamp;
        // Numeric string → parse as epoch (seconds if ≤10 digits, else ms)
        const n = /^\d+$/.test(raw) ? parseInt(raw, 10) : NaN;
        const date = !isNaN(n)
          ? new Date(n < 1e12 ? n * 1000 : n)
          : new Date(raw);
        time = isNaN(date.getTime())
          ? ""
          : `${DIM}${date.toLocaleTimeString()}${RESET} `;
      }
      const sender = msg.sender ?? "unknown";

      if (sender === "user") {
        console.log(`${time}${CYAN}👤 You:${RESET} ${msg.content ?? ""}`);
      } else if (sender === "agent" || sender === "assistant") {
        // Show tool results inline if present
        if (msg.tool_result) {
          const [toolName, result] = msg.tool_result;
          console.log(
            `${time}${GREEN}🔧 [${toolName}]${RESET} ${result.slice(0, 200)}${result.length > 200 ? "…" : ""}`,
          );
        }
        if (msg.content) {
          console.log(`${time}${CYAN}🤖 Agent:${RESET} ${msg.content}`);
        }
      } else if (sender === "system") {
        console.log(`${time}${YELLOW}⚙️  System:${RESET} ${msg.content ?? ""}`);
      } else {
        console.log(`${time}${DIM}[${sender}]${RESET} ${msg.content ?? ""}`);
      }
    }

    console.log(`\n${DIM}— ${messages.length} messages —${RESET}`);
    printDataFileLocation();
  } finally {
    session.close();
  }
}

function closeCommand(): void {
  const state = readState();
  if (state) {
    const { session } = getOrCreateSession();
    session.close();
  }
  clearState();
  console.log("Session closed");
}

function printUsage(): void {
  console.log(`
aomi — CLI client for Aomi on-chain agent

Usage:
  aomi chat <message>   Send a message and print the response
  aomi chat --verbose   Stream agent responses, tool calls, and events live
  aomi log              Show full conversation history with tool results
  aomi tx               List pending and signed transactions
  aomi sign <tx-id>     Sign and submit a pending transaction
  aomi status           Show current session state
  aomi events           List system events
  aomi close            Close the current session

Options:
  --backend-url <url>   Backend URL (default: https://api.aomi.dev)
  --api-key <key>       API key for non-default namespaces
  --namespace <ns>      Namespace (default: "default")
  --public-key <addr>   Wallet address (so the agent knows your wallet)
  --private-key <key>   Hex private key for signing
  --rpc-url <url>       RPC URL for transaction submission
  --verbose, -v         Show tool calls and streaming output (for chat)

Environment (overridden by flags):
  AOMI_BASE_URL         Backend URL
  AOMI_API_KEY          API key
  AOMI_NAMESPACE        Namespace
  AOMI_PUBLIC_KEY       Wallet address
  PRIVATE_KEY           Hex private key for signing
  CHAIN_RPC_URL         RPC URL for transaction submission
`.trim());
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  const cmd = parsed.command ?? (parsed.flags["help"] || parsed.flags["h"] ? "help" : undefined);

  switch (cmd) {
    case "chat":
      await chatCommand();
      break;
    case "log":
      await logCommand();
      break;
    case "tx":
      txCommand();
      break;
    case "sign":
      await signCommand();
      break;
    case "status":
      await statusCommand();
      break;
    case "events":
      await eventsCommand();
      break;
    case "close":
      closeCommand();
      break;
    case "help":
      printUsage();
      break;
    default:
      printUsage();
      if (cmd) throw new CliExit(1);
  }
}

main().catch((err) => {
  // CliExit errors are already printed — just exit
  if (err instanceof CliExit) {
    process.exit(err.code);
    return;
  }
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
