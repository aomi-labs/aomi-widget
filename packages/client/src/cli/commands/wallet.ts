import { type Chain, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as viemChains from "viem/chains";
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
