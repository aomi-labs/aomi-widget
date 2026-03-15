import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Chain } from "viem";
import { Session } from "../../session";
import type { WalletEip712Payload, WalletTxPayload } from "../../wallet-utils";
import { getOrCreateSession } from "../context";
import { CliExit, fatal } from "../errors";
import { DIM, GREEN, RESET, printDataFileLocation } from "../output";
import {
  addSignedTx,
  readState,
  removePendingTx,
  type CliSessionState,
} from "../state";
import { formatTxLine } from "../transactions";
import type { CliRuntime } from "../types";

type PackageManager = "pnpm" | "yarn" | "npm" | "unknown";

function detectPackageManager(cwd = process.cwd()): PackageManager {
  if (
    existsSync(join(cwd, "pnpm-workspace.yaml")) ||
    existsSync(join(cwd, "pnpm-lock.yaml"))
  ) {
    return "pnpm";
  }
  if (existsSync(join(cwd, "yarn.lock"))) {
    return "yarn";
  }
  if (existsSync(join(cwd, "package-lock.json"))) {
    return "npm";
  }
  return "unknown";
}

function isLikelyNpxExecution(): boolean {
  const argvPath = process.argv[1] ?? "";
  if (argvPath.includes("/_npx/") || argvPath.includes("\\_npx\\")) {
    return true;
  }

  const npmCommand = process.env.npm_command ?? "";
  const userAgent = process.env.npm_config_user_agent ?? "";
  return npmCommand === "exec" && userAgent.includes("npm/");
}

function missingViemHint(): string {
  const packageManager = detectPackageManager();
  const ranFromNpx = isLikelyNpxExecution();

  if (packageManager === "pnpm") {
    if (ranFromNpx) {
      return [
        "viem is missing in this runtime.",
        "Detected `npx` execution in a pnpm workspace.",
        "Use the local workspace CLI instead:",
        "  pnpm --filter @aomi-labs/client exec node dist/cli.js sign <tx-id> --private-key <key>",
        "If dependencies are missing, run:",
        "  pnpm install",
      ].join("\n");
    }

    return [
      "viem is required for `aomi sign`.",
      "This workspace uses pnpm. Run:",
      "  pnpm install",
      "Or add it explicitly:",
      "  pnpm add viem",
    ].join("\n");
  }

  if (packageManager === "yarn") {
    return [
      "viem is required for `aomi sign`.",
      "Install it with yarn:",
      "  yarn add viem",
    ].join("\n");
  }

  return [
    "viem is required for `aomi sign`.",
    "Install it with:",
    "  npm install viem",
    "  # or: pnpm add viem",
  ].join("\n");
}

export function txCommand(): void {
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

function requirePendingTx(state: CliSessionState, txId: string) {
  const pendingTx = (state.pendingTxs ?? []).find((tx) => tx.id === txId);
  if (!pendingTx) {
    fatal(
      `No pending transaction with id "${txId}".\nRun \`aomi tx\` to see available IDs.`,
    );
  }
  return pendingTx;
}

export async function signCommand(runtime: CliRuntime): Promise<void> {
  const txId = runtime.parsed.positional[0];
  if (!txId) {
    fatal(
      "Usage: aomi sign <tx-id>\nRun `aomi tx` to see pending transaction IDs.",
    );
  }

  const privateKey = runtime.config.privateKey;
  if (!privateKey) {
    fatal(
      [
        "Private key required for `aomi sign`.",
        "Pass one of:",
        "  --private-key <hex-key>",
        "  PRIVATE_KEY=<hex-key> aomi sign <tx-id>",
      ].join("\n"),
    );
  }

  const state = readState();
  if (!state) {
    fatal("No active session. Run `aomi chat` first.");
  }

  const pendingTx = requirePendingTx(state, txId);
  const { session } = getOrCreateSession(runtime);

  try {
    let viem: typeof import("viem");
    let viemAccounts: typeof import("viem/accounts");
    let viemChains: typeof import("viem/chains");
    try {
      viem = await import("viem");
      viemAccounts = await import("viem/accounts");
      viemChains = await import("viem/chains");
    } catch {
      fatal(missingViemHint());
    }

    const { createWalletClient, http } = viem;
    const { privateKeyToAccount } = viemAccounts;

    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const rpcUrl = runtime.config.chainRpcUrl;
    const targetChainId = pendingTx.chainId ?? 1;
    const chain =
      Object.values(viemChains).find(
        (candidate): candidate is Chain =>
          typeof candidate === "object" &&
          candidate !== null &&
          "id" in candidate &&
          (candidate as { id: number }).id === targetChainId,
      ) ??
      {
        id: targetChainId,
        name: `Chain ${targetChainId}`,
        nativeCurrency: {
          name: "ETH",
          symbol: "ETH",
          decimals: 18,
        },
        rpcUrls: {
          default: {
            http: [rpcUrl ?? ""],
          },
        },
      };

    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(rpcUrl),
    });

    console.log(`Signer:  ${account.address}`);
    console.log(`ID:      ${pendingTx.id}`);
    console.log(`Kind:    ${pendingTx.kind}`);

    if (pendingTx.kind === "transaction") {
      console.log(`To:      ${pendingTx.to}`);
      if (pendingTx.value) console.log(`Value:   ${pendingTx.value}`);
      if (pendingTx.chainId) console.log(`Chain:   ${pendingTx.chainId}`);
      if (pendingTx.data) {
        console.log(`Data:    ${pendingTx.data.slice(0, 40)}...`);
      }
      console.log();

      const hash = await walletClient.sendTransaction({
        to: pendingTx.to as `0x${string}`,
        value: pendingTx.value ? BigInt(pendingTx.value) : 0n,
        data: (pendingTx.data as `0x${string}`) ?? undefined,
      });

      console.log(`✅ Sent! Hash: ${hash}`);

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

      await session.client.sendSystemMessage(
        state.sessionId,
        JSON.stringify({
          type: "wallet:tx_complete",
          payload: { txHash: hash, status: "success" },
        }),
      );
    } else {
      const typedData = pendingTx.payload.typed_data as {
        domain?: Record<string, unknown>;
        types?: Record<string, Array<{ name: string; type: string }>>;
        primaryType?: string;
        message?: Record<string, unknown>;
      } | undefined;

      if (!typedData) {
        fatal("EIP-712 request is missing typed_data payload.");
      }

      if (pendingTx.description) {
        console.log(`Desc:    ${pendingTx.description}`);
      }
      if (typedData.primaryType) {
        console.log(`Type:    ${typedData.primaryType}`);
      }
      console.log();

      const { domain, types, primaryType, message } = typedData;
      const sigTypes = { ...types };
      delete sigTypes["EIP712Domain"];

      const signature = await walletClient.signTypedData({
        domain: domain as Record<string, unknown>,
        types: sigTypes as Record<string, Array<{ name: string; type: string }>>,
        primaryType: primaryType as string,
        message: message as Record<string, unknown>,
      });

      console.log(`✅ Signed! Signature: ${signature.slice(0, 20)}...`);

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
