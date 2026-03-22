import { type Chain, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as viemChains from "viem/chains";
import {
  DISABLED_PROVIDER_STATE,
  executeWalletCalls,
  type TransactionExecutionResult,
} from "../../aa";
import { ClientSession } from "../../session";
import type { WalletEip712Payload } from "../../wallet-utils";
import { CliExit, fatal } from "../errors";
import { DIM, GREEN, RESET, printDataFileLocation } from "../output";
import {
  addSignedTx,
  readState,
  removePendingTx,
  writeState,
  type CliSessionState,
} from "../state";
import {
  formatSignedTxLine,
  formatTxLine,
  pendingTxToCallList,
  toSignedTransactionRecord,
} from "../transactions";
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
      console.log(formatSignedTxLine(tx, "  ✅"));
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

function rewriteSessionState(
  runtime: CliRuntime,
  state: CliSessionState,
): void {
  let changed = false;

  if (runtime.config.baseUrl !== state.baseUrl) {
    state.baseUrl = runtime.config.baseUrl;
    changed = true;
  }

  if (runtime.config.app !== state.app) {
    state.app = runtime.config.app;
    changed = true;
  }

  if (
    runtime.config.apiKey !== undefined &&
    runtime.config.apiKey !== state.apiKey
  ) {
    state.apiKey = runtime.config.apiKey;
    changed = true;
  }

  if (runtime.config.chain !== undefined && runtime.config.chain !== state.chainId) {
    state.chainId = runtime.config.chain;
    changed = true;
  }

  if (changed) {
    writeState(state);
  }
}

function createSessionFromState(state: CliSessionState): ClientSession {
  const session = new ClientSession(
    { baseUrl: state.baseUrl, apiKey: state.apiKey },
    {
      sessionId: state.sessionId,
      app: state.app,
      apiKey: state.apiKey,
      publicKey: state.publicKey,
    },
  );

  if (state.publicKey) {
    session.resolveWallet(state.publicKey, state.chainId);
  }

  return session;
}

async function persistResolvedSignerState(
  session: ClientSession,
  state: CliSessionState,
  address: string,
  chainId?: number,
): Promise<void> {
  state.publicKey = address;
  writeState(state);

  session.resolveWallet(address, chainId);
  await session.syncUserState();
}

function resolveChain(targetChainId: number, rpcUrl?: string): Chain {
  return (
    Object.values(viemChains).find(
      (candidate): candidate is Chain =>
        typeof candidate === "object" &&
        candidate !== null &&
        "id" in candidate &&
        (candidate as { id: number }).id === targetChainId,
    ) ?? {
      id: targetChainId,
      name: `Chain ${targetChainId}`,
      nativeCurrency: {
        name: "ETH",
        symbol: "ETH",
        decimals: 18,
      },
      rpcUrls: {
        default: {
          http: rpcUrl ? [rpcUrl] : [],
        },
      },
    }
  );
}

function getPreferredRpcUrl(chain: Chain, override?: string): string {
  return (
    override ??
    chain.rpcUrls.default.http[0] ??
    chain.rpcUrls.public?.http[0] ??
    ""
  );
}

async function executeCliTransaction(params: {
  privateKey: `0x${string}`;
  chain: Chain;
  callChainId: number;
  rpcUrl?: string;
  pendingTx: ReturnType<typeof requirePendingTx>;
}): Promise<TransactionExecutionResult> {
  const { privateKey, chain, callChainId, rpcUrl, pendingTx } = params;
  const callList = pendingTxToCallList({
    ...pendingTx,
    chainId: callChainId,
  });

  const unsupportedWalletMethod = async (): Promise<never> => {
    throw new Error("wallet_client_path_unavailable_in_cli_private_key_mode");
  };

  return executeWalletCalls({
    callList,
    currentChainId: callChainId,
    capabilities: undefined,
    localPrivateKey: privateKey,
    providerState: DISABLED_PROVIDER_STATE,
    sendCallsSyncAsync: unsupportedWalletMethod,
    sendTransactionAsync: unsupportedWalletMethod,
    switchChainAsync: async () => undefined,
    chainsById: {
      [chain.id]: chain,
    },
    getPreferredRpcUrl: (resolvedChain) => getPreferredRpcUrl(resolvedChain, rpcUrl),
  });
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

  rewriteSessionState(runtime, state);

  const pendingTx = requirePendingTx(state, txId);
  const session = createSessionFromState(state);

  try {
    const account = privateKeyToAccount(privateKey as `0x${string}`);

    if (
      state.publicKey &&
      account.address.toLowerCase() !== state.publicKey.toLowerCase()
    ) {
      console.log(
        `⚠️  Signer ${account.address} differs from session public key ${state.publicKey}`,
      );
      console.log("   Updating session to match the signing key...");
    }

    const rpcUrl = runtime.config.chainRpcUrl;
    const targetChainId = pendingTx.chainId ?? state.chainId ?? 1;
    const chain = resolveChain(targetChainId, rpcUrl);

    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(getPreferredRpcUrl(chain, rpcUrl)),
    });

    console.log(`Signer:  ${account.address}`);
    console.log(`ID:      ${pendingTx.id}`);
    console.log(`Kind:    ${pendingTx.kind}`);

    let signedRecord: Parameters<typeof addSignedTx>[1];
    let backendNotification: { type: string; payload: Record<string, unknown> };

    if (pendingTx.kind === "transaction") {
      console.log(`To:      ${pendingTx.to}`);
      if (pendingTx.value) console.log(`Value:   ${pendingTx.value}`);
      if (pendingTx.chainId) console.log(`Chain:   ${pendingTx.chainId}`);
      if (pendingTx.data) {
        console.log(`Data:    ${pendingTx.data.slice(0, 40)}...`);
      }
      console.log();

      const execution = await executeCliTransaction({
        privateKey: privateKey as `0x${string}`,
        chain,
        callChainId: targetChainId,
        rpcUrl,
        pendingTx,
      });

      console.log(`✅ Sent! Hash: ${execution.txHash}`);
      console.log(`Exec:    ${execution.executionKind}`);
      if (execution.txHashes.length > 1) {
        console.log(`Count:   ${execution.txHashes.length}`);
      }
      if (execution.sponsored) {
        console.log("Gas:     sponsored");
      }
      if (execution.AAAddress) {
        console.log(`AA:      ${execution.AAAddress}`);
      }
      if (execution.delegationAddress) {
        console.log(`Deleg:   ${execution.delegationAddress}`);
      }

      signedRecord = toSignedTransactionRecord(
        pendingTx,
        execution,
        account.address,
        targetChainId,
        Date.now(),
      );
      backendNotification = {
        type: "wallet:tx_complete",
        payload: { txHash: execution.txHash, status: "success" },
      };
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

      signedRecord = {
        id: txId,
        kind: "eip712_sign",
        signature,
        from: account.address,
        description: pendingTx.description,
        timestamp: Date.now(),
      };
      backendNotification = {
        type: "wallet_eip712_response",
        payload: {
          status: "success",
          signature,
          description: pendingTx.description,
        },
      };
    }

    await persistResolvedSignerState(
      session,
      state,
      account.address,
      targetChainId,
    );

    removePendingTx(state, txId);
    const freshState = readState()!;
    addSignedTx(freshState, signedRecord);

    await session.client.sendSystemMessage(
      state.sessionId,
      JSON.stringify(backendNotification),
    );

    console.log("Backend notified.");
  } catch (err) {
    if (err instanceof CliExit) throw err;
    const errMsg = err instanceof Error ? err.message : String(err);
    fatal(`❌ Signing failed: ${errMsg}`);
  } finally {
    session.close();
  }
}
