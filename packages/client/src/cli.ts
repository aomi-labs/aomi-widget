// =============================================================================
// Aomi CLI
// =============================================================================
//
// Minimal CLI for interacting with the Aomi backend.
// Designed for scripting, bots, and Claude Code skills.
//
// Usage:
//   aomi chat "swap 1 ETH for USDC"
//   aomi status
//   aomi events
//   aomi sign
//   aomi close
//
// Environment:
//   AOMI_BASE_URL   — Backend URL (default: https://api.aomi.dev)
//   AOMI_API_KEY    — API key for non-default namespaces
//   AOMI_NAMESPACE  — Namespace (default: "default")
//   PRIVATE_KEY     — Hex private key for `aomi sign` (viem required)
//   CHAIN_RPC_URL   — RPC URL for signing (default: chain default)

import { Session } from "./session";
import {
  readState,
  writeState,
  clearState,
  type CliSessionState,
} from "./cli-state";

const [, , command, ...args] = process.argv;

function getEnv() {
  return {
    baseUrl: process.env.AOMI_BASE_URL ?? "https://api.aomi.dev",
    apiKey: process.env.AOMI_API_KEY,
    namespace: process.env.AOMI_NAMESPACE ?? "default",
  };
}

function getOrCreateSession(): { session: Session; state: CliSessionState } {
  const env = getEnv();

  let state = readState();
  if (!state) {
    state = {
      sessionId: crypto.randomUUID(),
      baseUrl: env.baseUrl,
      namespace: env.namespace,
      apiKey: env.apiKey,
    };
    writeState(state);
  }

  const session = new Session(
    { baseUrl: state.baseUrl, apiKey: state.apiKey },
    {
      sessionId: state.sessionId,
      namespace: state.namespace,
      apiKey: state.apiKey,
    },
  );

  return { session, state };
}

// =============================================================================
// Commands
// =============================================================================

async function chatCommand(): Promise<void> {
  const message = args.join(" ");
  if (!message) {
    console.error("Usage: aomi chat <message>");
    process.exit(1);
  }

  const { session } = getOrCreateSession();

  try {
    const result = await session.send(message);

    // Print last agent message
    const agentMessages = result.messages.filter(
      (m) => m.sender === "agent" || m.sender === "assistant",
    );
    const last = agentMessages[agentMessages.length - 1];

    if (last?.content) {
      console.log(last.content);
    } else {
      console.log("(no response)");
    }
  } finally {
    session.close();
  }
}

async function statusCommand(): Promise<void> {
  const state = readState();
  if (!state) {
    console.log("No active session");
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
        },
        null,
        2,
      ),
    );
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

async function signCommand(): Promise<void> {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("PRIVATE_KEY env var required for signing");
    process.exit(1);
  }

  const state = readState();
  if (!state) {
    console.error("No active session. Run `aomi chat` first.");
    process.exit(1);
  }

  const { session } = getOrCreateSession();

  try {
    // Dynamic import — viem is an optional peer dep
    const { createWalletClient, http } = await import("viem");
    const { privateKeyToAccount } = await import("viem/accounts");
    const { mainnet } = await import("viem/chains");

    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const rpcUrl = process.env.CHAIN_RPC_URL;

    const walletClient = createWalletClient({
      account,
      chain: mainnet,
      transport: http(rpcUrl),
    });

    console.log(`Signer address: ${account.address}`);

    // Poll for pending wallet requests
    const apiState = await session.client.fetchState(state.sessionId);

    if (!apiState.is_processing) {
      console.log("No active processing. Nothing to sign.");
      return;
    }

    // Listen for wallet requests
    console.log("Waiting for wallet requests...");

    session.on("wallet_tx_request", async (req) => {
      const tx = req.payload as {
        to: string;
        value?: string;
        data?: string;
        chainId?: number;
      };

      console.log(`\nTransaction request (${req.id}):`);
      console.log(`  to:    ${tx.to}`);
      console.log(`  value: ${tx.value ?? "0"}`);
      if (tx.data) console.log(`  data:  ${tx.data.slice(0, 20)}...`);

      try {
        const hash = await walletClient.sendTransaction({
          to: tx.to as `0x${string}`,
          value: tx.value ? BigInt(tx.value) : 0n,
          data: (tx.data as `0x${string}`) ?? undefined,
        });

        console.log(`  tx:    ${hash}`);
        await session.resolve(req.id, { txHash: hash });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`  error: ${errMsg}`);
        await session.reject(req.id, errMsg);
      }
    });

    // Wait for processing to finish
    await new Promise<void>((resolve) => {
      session.on("processing_end", () => resolve());
      // Timeout after 5 minutes
      setTimeout(() => {
        console.log("Timed out waiting for requests.");
        resolve();
      }, 5 * 60 * 1000);
    });
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
  aomi status           Show current session state
  aomi events           List system events
  aomi sign             Auto-sign pending wallet transactions (requires PRIVATE_KEY)
  aomi close            Close the current session

Environment:
  AOMI_BASE_URL         Backend URL (default: https://api.aomi.dev)
  AOMI_API_KEY          API key for non-default namespaces
  AOMI_NAMESPACE        Namespace (default: "default")
  PRIVATE_KEY           Hex private key for signing
  CHAIN_RPC_URL         RPC URL for transaction submission
`.trim());
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  switch (command) {
    case "chat":
      await chatCommand();
      break;
    case "status":
      await statusCommand();
      break;
    case "events":
      await eventsCommand();
      break;
    case "sign":
      await signCommand();
      break;
    case "close":
      closeCommand();
      break;
    case "--help":
    case "-h":
    case "help":
      printUsage();
      break;
    default:
      printUsage();
      process.exit(command ? 1 : 0);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
