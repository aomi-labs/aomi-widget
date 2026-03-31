import { type Chain, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as viemChains from "viem/chains";
import {
  executeWalletCalls,
  type TransactionExecutionResult,
} from "../../aa";
import { ClientSession } from "../../session";
import type { WalletEip712Payload } from "../../wallet-utils";
import { CliExit, fatal } from "../errors";
import {
  createCliProviderState,
  describeExecutionDecision,
  isAlchemySponsorshipLimitError,
  resolveCliExecutionDecision,
} from "../execution";
import { DIM, GREEN, RESET, printDataFileLocation } from "../output";
import {
  addSignedTx,
  readState,
  removePendingTx,
  writeState,
  type CliSessionState,
} from "../state";
import { buildCliUserState } from "../user-state";
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

function requirePendingTxs(
  state: CliSessionState,
  txIds: string[],
): ReturnType<typeof requirePendingTx>[] {
  const uniqueIds = Array.from(new Set(txIds));
  if (uniqueIds.length !== txIds.length) {
    fatal("Duplicate transaction IDs are not allowed in a single `aomi sign` call.");
  }

  return uniqueIds.map((txId) => requirePendingTx(state, txId));
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

  const userState = buildCliUserState(state.publicKey, state.chainId);
  if (userState) {
    session.resolveUserState(userState);
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
  currentChainId: number;
  chainsById: Record<number, Chain>;
  rpcUrl?: string;
  providerState: Awaited<ReturnType<typeof createCliProviderState>>;
  callList: ReturnType<typeof pendingTxToCallList>;
}): Promise<TransactionExecutionResult> {
  const { privateKey, currentChainId, chainsById, rpcUrl, providerState, callList } = params;
  const unsupportedWalletMethod = async (): Promise<never> => {
    throw new Error("wallet_client_path_unavailable_in_cli_private_key_mode");
  };

  return executeWalletCalls({
    callList,
    currentChainId,
    capabilities: undefined,
    localPrivateKey: privateKey,
    providerState,
    sendCallsSyncAsync: unsupportedWalletMethod,
    sendTransactionAsync: unsupportedWalletMethod,
    switchChainAsync: async () => undefined,
    chainsById,
    getPreferredRpcUrl: (resolvedChain) => getPreferredRpcUrl(resolvedChain, rpcUrl),
  });
}

async function executeTransactionWithFallback(params: {
  decision: ReturnType<typeof resolveCliExecutionDecision>;
  privateKey: `0x${string}`;
  currentChainId: number;
  chainsById: Record<number, Chain>;
  primaryChain: Chain;
  rpcUrl?: string;
  callList: ReturnType<typeof pendingTxToCallList>;
}): Promise<{
  execution: TransactionExecutionResult;
  finalDecision: ReturnType<typeof resolveCliExecutionDecision>;
}> {
  const { decision, privateKey, currentChainId, chainsById, primaryChain, rpcUrl, callList } =
    params;

  const runExecution = async (
    providerState: Awaited<ReturnType<typeof createCliProviderState>>,
  ) =>
    executeCliTransaction({
      privateKey,
      currentChainId,
      chainsById,
      rpcUrl,
      providerState,
      callList,
    });

  if (decision.execution === "eoa") {
    const providerState = await createCliProviderState({
      decision,
      chain: primaryChain,
      privateKey,
      rpcUrl: rpcUrl ?? "",
      callList,
    });
    return {
      execution: await runExecution(providerState),
      finalDecision: decision,
    };
  }

  let providerState = await createCliProviderState({
    decision,
    chain: primaryChain,
    privateKey,
    rpcUrl: rpcUrl ?? "",
    callList,
    sponsored: true,
  });

  try {
    return {
      execution: await runExecution(providerState),
      finalDecision: decision,
    };
  } catch (error) {
    const shouldRetryUnsponsored =
      decision.provider === "alchemy" &&
      isAlchemySponsorshipLimitError(error);

    if (shouldRetryUnsponsored) {
      console.log("AA sponsorship unavailable. Retrying AA with user-funded gas...");
      providerState = await createCliProviderState({
        decision,
        chain: primaryChain,
        privateKey,
        rpcUrl: rpcUrl ?? "",
        callList,
        sponsored: false,
      });

      try {
        return {
          execution: await runExecution(providerState),
          finalDecision: decision,
        };
      } catch (retryError) {
        error = retryError;
      }
    }

    if (!decision.fallbackToEoa) {
      throw error;
    }

    const eoaDecision = { execution: "eoa" } as const;
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`AA execution failed: ${errorMessage}`);
    console.log("Retrying with EOA execution...");
    const eoaProviderState = await createCliProviderState({
      decision: eoaDecision,
      chain: primaryChain,
      privateKey,
      rpcUrl: rpcUrl ?? "",
      callList,
    });
    return {
      execution: await runExecution(eoaProviderState),
      finalDecision: eoaDecision,
    };
  }
}

export async function signCommand(runtime: CliRuntime): Promise<void> {
  const txIds = runtime.parsed.positional;
  if (txIds.length === 0) {
    fatal(
      "Usage: aomi sign <tx-id> [<tx-id> ...]\nRun `aomi tx` to see pending transaction IDs.",
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

  const pendingTxs = requirePendingTxs(state, txIds);
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
    const resolvedChainIds = pendingTxs.map((tx) => tx.chainId ?? state.chainId ?? 1);
    const primaryChainId = resolvedChainIds[0];
    const chain = resolveChain(primaryChainId, rpcUrl);
    const resolvedRpcUrl = getPreferredRpcUrl(chain, rpcUrl);
    const chainsById = Object.fromEntries(
      Array.from(new Set(resolvedChainIds)).map((chainId) => [
        chainId,
        resolveChain(chainId, rpcUrl),
      ]),
    ) as Record<number, Chain>;

    console.log(`Signer:  ${account.address}`);
    console.log(`IDs:     ${pendingTxs.map((tx) => tx.id).join(", ")}`);

    let signedRecords: Parameters<typeof addSignedTx>[1][] = [];
    let backendNotifications: Array<{ type: string; payload: Record<string, unknown> }> = [];

    if (pendingTxs.every((tx) => tx.kind === "transaction")) {
      console.log(`Kind:    transaction${pendingTxs.length > 1 ? " (batch)" : ""}`);
      for (const tx of pendingTxs) {
        console.log(`Tx:      ${tx.id} -> ${tx.to}`);
        if (tx.value) console.log(`Value:   ${tx.value}`);
        if (tx.chainId ?? state.chainId) console.log(`Chain:   ${tx.chainId ?? state.chainId}`);
        if (tx.data) {
          console.log(`Data:    ${tx.data.slice(0, 40)}...`);
        }
      }
      console.log();

      const callList = pendingTxs.flatMap((tx, index) =>
        pendingTxToCallList({
          ...tx,
          chainId: resolvedChainIds[index],
        }),
      );
      if (callList.length > 1 && rpcUrl && new Set(callList.map((call) => call.chainId)).size > 1) {
        fatal("A single `--rpc-url` override cannot be used for a mixed-chain multi-sign request.");
      }
      const decision = resolveCliExecutionDecision({
        config: runtime.config,
        chain,
        callList,
      });
      console.log(`Exec:    ${describeExecutionDecision(decision)}`);

      const { execution, finalDecision } = await executeTransactionWithFallback({
        decision,
        privateKey: privateKey as `0x${string}`,
        currentChainId: primaryChainId,
        chainsById,
        primaryChain: chain,
        rpcUrl,
        callList,
      });

      console.log(`✅ Sent! Hash: ${execution.txHash}`);
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

      signedRecords = pendingTxs.map((tx, index) =>
        toSignedTransactionRecord(
          tx,
          execution,
          account.address,
          resolvedChainIds[index],
          Date.now(),
          finalDecision.execution === "aa" ? finalDecision.provider : undefined,
          finalDecision.execution === "aa" ? finalDecision.aaMode : undefined,
        ),
      );
      backendNotifications = pendingTxs.map(() => ({
        type: "wallet:tx_complete",
        payload: { txHash: execution.txHash, status: "success" },
      }));
    } else {
      if (pendingTxs.length > 1) {
        fatal("Batch signing is only supported for transaction requests, not EIP-712 requests.");
      }

      const pendingTx = pendingTxs[0];
      const walletClient = createWalletClient({
        account,
        chain,
        transport: http(resolvedRpcUrl),
      });
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

      signedRecords = [{
        id: pendingTx.id,
        kind: "eip712_sign",
        signature,
        from: account.address,
        description: pendingTx.description,
        timestamp: Date.now(),
      }];
      backendNotifications = [{
        type: "wallet_eip712_response",
        payload: {
          status: "success",
          signature,
          description: pendingTx.description,
        },
      }];
    }

    await persistResolvedSignerState(
      session,
      state,
      account.address,
      primaryChainId,
    );

    for (const txId of txIds) {
      removePendingTx(state, txId);
    }
    const freshState = readState()!;
    for (const signedRecord of signedRecords) {
      addSignedTx(freshState, signedRecord);
    }

    for (const backendNotification of backendNotifications) {
      await session.client.sendSystemMessage(
        state.sessionId,
        JSON.stringify(backendNotification),
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
