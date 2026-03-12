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
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = "true";
      }
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
  const message = parsed.positional.join(" ");
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
  const config = getConfig();
  const privateKey = config.privateKey;
  if (!privateKey) {
    console.error("Private key required for signing. Pass --private-key or set PRIVATE_KEY env var.");
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
    const rpcUrl = config.chainRpcUrl;

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
  aomi sign             Auto-sign pending wallet transactions
  aomi close            Close the current session

Options:
  --backend-url <url>   Backend URL (default: https://api.aomi.dev)
  --api-key <key>       API key for non-default namespaces
  --namespace <ns>      Namespace (default: "default")
  --private-key <key>   Hex private key for signing
  --rpc-url <url>       RPC URL for transaction submission

Environment (overridden by flags):
  AOMI_BASE_URL         Backend URL
  AOMI_API_KEY          API key
  AOMI_NAMESPACE        Namespace
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
    case "help":
      printUsage();
      break;
    default:
      printUsage();
      process.exit(cmd ? 1 : 0);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
