import { createRuntime } from "./args";
import { chatCommand } from "./commands/chat";
import {
  eventsCommand,
  modelCommand,
  modelsCommand,
  statusCommand,
} from "./commands/control";
import { closeCommand, logCommand } from "./commands/history";
import { sessionCommand, sessionsCommand } from "./commands/sessions";
import { signCommand, txCommand } from "./commands/wallet";
import { CliExit } from "./errors";
import type { CliRuntime } from "./types";

function printUsage(): void {
  console.log(`
aomi — CLI client for Aomi on-chain agent

Usage:
  aomi chat <message>   Send a message and print the response
  aomi chat --model <rig>
                        Set the session model before sending the message
  aomi chat --verbose   Stream agent responses, tool calls, and events live
  aomi models           List models available to the current backend
  aomi model set <rig>  Set the active model for the current session
  aomi sessions         List local sessions with metadata tables
  aomi session resume <id>
                        Resume a local session (session-id or session-N)
  aomi session delete <id>
                        Delete a local session file (session-id or session-N)
  aomi log              Show full conversation history with tool results
  aomi tx               List pending and signed transactions
  aomi sign <tx-id> [<tx-id> ...] [--aa | --eoa] [--aa-provider <name>] [--aa-mode <mode>]
                        Sign and submit a pending transaction
  aomi status           Show current session state
  aomi events           List system events
  aomi close            Close the current session

Options:
  --backend-url <url>   Backend URL (default: https://api.aomi.dev)
  --api-key <key>       API key for non-default apps
  --app <name>          App (default: "default")
  --model <rig>         Set the active model for this session
  --public-key <addr>   Wallet address (so the agent knows your wallet)
  --private-key <key>   Hex private key for signing
  --rpc-url <url>       RPC URL for transaction submission
  --verbose, -v         Show tool calls and streaming output (for chat)

Sign options:
  aomi sign <tx-id> --aa
                        Require account-abstraction execution (default)
  aomi sign <tx-id> --eoa
                        Force plain EOA execution
  aomi sign <tx-id> --aa-provider <name>
                        AA provider: alchemy | pimlico
  aomi sign <tx-id> --aa-mode <mode>
                        AA mode: 4337 | 7702

Environment (overridden by flags):
  AOMI_BASE_URL         Backend URL
  AOMI_API_KEY          API key
  AOMI_APP              App
  AOMI_MODEL            Model rig
  AOMI_PUBLIC_KEY       Wallet address
  AOMI_AA_PROVIDER      AA provider: alchemy | pimlico
  AOMI_AA_MODE          AA mode: 4337 | 7702
  ALCHEMY_API_KEY       Alchemy AA API key
  ALCHEMY_GAS_POLICY_ID
                        Optional Alchemy gas sponsorship policy ID
  PIMLICO_API_KEY       Pimlico AA API key
  PRIVATE_KEY           Hex private key for signing
  CHAIN_RPC_URL         RPC URL for transaction submission
`.trim());
}

async function main(runtime: CliRuntime): Promise<void> {
  const command =
    runtime.parsed.command ??
    (runtime.parsed.flags["help"] || runtime.parsed.flags["h"]
      ? "help"
      : undefined);

  switch (command) {
    case "chat":
      await chatCommand(runtime);
      break;
    case "log":
      await logCommand(runtime);
      break;
    case "models":
      await modelsCommand(runtime);
      break;
    case "model":
      await modelCommand(runtime);
      break;
    case "sessions":
      await sessionsCommand(runtime);
      break;
    case "session":
      sessionCommand(runtime);
      break;
    case "tx":
      txCommand();
      break;
    case "sign":
      await signCommand(runtime);
      break;
    case "status":
      await statusCommand(runtime);
      break;
    case "events":
      await eventsCommand(runtime);
      break;
    case "close":
      closeCommand(runtime);
      break;
    case "help":
      printUsage();
      break;
    default:
      printUsage();
      if (command) {
        throw new CliExit(1);
      }
  }
}

function isPnpmExecWrapper(): boolean {
  const npmCommand = process.env.npm_command ?? "";
  const userAgent = process.env.npm_config_user_agent ?? "";
  return npmCommand === "exec" && userAgent.includes("pnpm/");
}

export async function runCli(argv: string[] = process.argv): Promise<void> {
  const runtime = createRuntime(argv);
  const RED = "\x1b[31m";
  const RESET = "\x1b[0m";
  const strictExit = process.env.AOMI_CLI_STRICT_EXIT === "1";

  try {
    await main(runtime);
  } catch (err) {
    if (err instanceof CliExit) {
      if (!strictExit && isPnpmExecWrapper()) {
        return;
      }
      process.exit(err.code);
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${RED}❌ ${message}${RESET}`);
    process.exit(1);
  }
}
