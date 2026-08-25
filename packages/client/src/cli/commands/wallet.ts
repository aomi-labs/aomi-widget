import { type Chain, createWalletClient, formatEther, http } from "viem";
import { Connection } from "@solana/web3.js";
import { privateKeyToAccount } from "viem/accounts";
import * as viemChains from "viem/chains";
import {
  buildFeeAAWalletCall,
  executeWalletCalls,
  normalizeSimulatedFee,
  partialWalletExecution,
  type ExecutionResult,
  type NormalizedSimulatedFee,
} from "../../aa";
import {
  toViemSignMessageArgs,
  toViemSignTypedDataArgs,
  type WalletEip712Payload,
} from "../../wallet-utils";
import type { AomiSimulateFee, AomiSimulateResponse } from "../../types";
import type { WalletRequestResult, WalletSolanaLegResult } from "../../session";
import { CliSession } from "../cli-session";
import { CliExit, fatal } from "../errors";
import {
  parseSolanaKeypairSecret,
  signSolanaMessage,
  signSolanaTransaction,
} from "../solana-signer";
import { DIM, RESET, printDataFileLocation, printJson } from "../output";
import type { PendingSolTx, PendingTx, SignedTx } from "../state";
import {
  formatPendingSolTxLine,
  formatSignedSolTxLine,
  formatSignedTxLine,
  formatTxLine,
  pendingTxToCallList,
  toSignedTransactionRecord,
  walletRequestToPendingSolTx,
  walletRequestToPendingTx,
} from "../transactions";
import type { CliConfig } from "../types";
import { toPendingTxMetadata, toSignedTxMetadata } from "../tables";

export async function txCommand(config: CliConfig): Promise<void> {
  const cli = CliSession.load();
  if (!cli) {
    if (config.json) {
      printJson({ active: false, pending: [], signed: [] });
      return;
    }
    console.log("No active session");
    printDataFileLocation({ verbose: config.verbose });
    return;
  }

  const session = cli.createClientSession(config);
  try {
    await session.fetchCurrentState();
    for (const request of session.getPendingRequests()) {
      const evm = walletRequestToPendingTx(request);
      if (evm) cli.addPendingTx(evm);
      const svm = walletRequestToPendingSolTx(request);
      if (svm) cli.addPendingSolTx(svm);
    }
  } catch {
    // Fall back to the last persisted local view if the backend is unavailable.
  } finally {
    session.close();
  }

  const pending = [...cli.pendingTxs];
  const pendingSol = [...cli.pendingSolTxs];
  const pendingSelectors = cli.pendingSelectors();
  const evmSelectors = pendingSelectors.slice(0, pending.length);
  const svmSelectors = pendingSelectors.slice(pending.length);
  const signed = [...cli.signedTxs];
  const signedSol = [...cli.signedSolTxs];

  const totalPending = pending.length + pendingSol.length;
  const totalSigned = signed.length + signedSol.length;

  if (config.json) {
    printJson({
      active: true,
      pending: [
        ...pending.map((tx, index) => ({
          ...toPendingTxMetadata(tx),
          id: evmSelectors[index],
        })),
        ...pendingSol.map((tx, index) => ({
          id: svmSelectors[index],
          kind: tx.requestKind ?? "solana_sign",
          solanaId: tx.solanaId,
          signer: tx.signer ?? null,
          cluster: tx.cluster ?? null,
          description: tx.description ?? null,
          timestamp: new Date(tx.timestamp).toISOString(),
        })),
      ],
      signed: [
        ...signed.map((tx) => toSignedTxMetadata(tx)),
        ...signedSol.map((tx) => ({
          id: tx.id,
          kind: tx.requestKind ?? "solana_sign",
          signedTx: tx.signedTx ?? null,
          signer: tx.signer ?? null,
          cluster: tx.cluster ?? null,
          description: tx.description ?? null,
          timestamp: new Date(tx.timestamp).toISOString(),
        })),
      ],
    });
    return;
  }

  if (totalPending === 0 && totalSigned === 0) {
    console.log("No transactions.");
    printDataFileLocation({ verbose: config.verbose });
    return;
  }

  if (totalPending > 0) {
    console.log(`Pending (${totalPending}):`);
    for (const [index, tx] of pending.entries()) {
      console.log(formatTxLine({ ...tx, id: evmSelectors[index] }, "  ⏳"));
    }
    for (const [index, tx] of pendingSol.entries()) {
      console.log(
        formatPendingSolTxLine({ ...tx, id: svmSelectors[index] }, "  ⏳"),
      );
    }
  }

  if (totalSigned > 0) {
    if (totalPending > 0) console.log();
    console.log(`Signed (${totalSigned}):`);
    for (const tx of signed) {
      console.log(formatSignedTxLine(tx, "  ✅"));
    }
    for (const tx of signedSol) {
      console.log(formatSignedSolTxLine(tx, "  ✅"));
    }
  }

  printDataFileLocation({ verbose: config.verbose });
}

function resolveChain(targetChainId: number, rpcUrl?: string): Chain {
  const knownChain = Object.values(viemChains).find((candidate) => {
    return (
      typeof candidate === "object" &&
      candidate !== null &&
      "id" in candidate &&
      (candidate as { id: number }).id === targetChainId
    );
  });

  return (
    (knownChain as Chain | undefined) ?? {
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
  if (override) {
    return override;
  }

  return chain.rpcUrls.default.http[0] ?? chain.rpcUrls.public?.http[0] ?? "";
}

async function simulatePendingTransactions(params: {
  session: ReturnType<CliSession["createClientSession"]>;
  cli: CliSession;
  pendingTxs: PendingTx[];
  resolvedChainIds: number[];
  chainId: number;
}): Promise<AomiSimulateResponse["result"]> {
  const { session, cli, pendingTxs, resolvedChainIds, chainId } = params;

  const simResponse = await session.client.simulateBatch(
    cli.sessionId,
    pendingTxs.map((tx, index) => ({
      to: tx.to ?? "",
      value: tx.value,
      data: tx.data,
      label: tx.description ?? tx.id,
      chain_id: resolvedChainIds[index],
    })),
    {
      chainId,
    },
  );

  return simResponse.result;
}

/**
 * Drive the Solana wallet branch end-to-end:
 *   1. Load + parse the local Solana keypair from `--solana-private-key`
 *      (or `SOLANA_PRIVATE_KEY` env).
 *   2. Sign the base64 unsigned tx in place.
 *   3. For send requests, submit and confirm the signed bytes through the
 *      selected Solana RPC; for sign-only requests, return the signed bytes.
 *   4. Post the corresponding terminal callback so backend pending state and
 *      continuation routes resolve.
 *   5. Persist the signed record locally for `aomi tx list`.
 *
 * The host's `domain.svm.address` is informational; this CLI path always signs
 * with whatever keypair the user provided. We do warn on mismatch.
 */
async function signSolanaPending(params: {
  cli: CliSession;
  session: ReturnType<CliSession["createClientSession"]>;
  config: CliConfig;
  pendingTx: PendingSolTx;
}): Promise<void> {
  const { cli, session, config, pendingTx } = params;
  if (!pendingTx.agentRequestId) {
    fatal(
      "This wallet request predates Agent v1 and cannot be submitted. Start a new Agent turn to recreate it.",
    );
  }
  const secret =
    cli.resolvedSvmPrivateKey(config.solanaPrivateKey) ??
    process.env.SOLANA_PRIVATE_KEY;
  if (!secret) {
    fatal(
      [
        "Solana keypair required for `aomi tx sign` on an SVM request.",
        "Pass one of:",
        "  aomi wallet set --solana <base58-key>             # persist once",
        "  aomi tx sign --solana-private-key <base58|json> <tx-id>",
        "  SOLANA_PRIVATE_KEY=<base58|json> aomi tx sign <tx-id>",
        "",
        "Accepted formats:",
        "  base58 of the 64-byte secret key (Phantom / Solflare export)",
        "  JSON byte array `[1,2,...,64]` (solana-keygen output)",
      ].join("\n"),
    );
  }

  let keypair;
  try {
    keypair = parseSolanaKeypairSecret(secret);
  } catch (err) {
    fatal(err instanceof Error ? err.message : String(err));
  }

  if (pendingTx.signer && pendingTx.signer !== keypair.publicKey.toBase58()) {
    console.log(
      `⚠️  Local signer ${keypair.publicKey.toBase58()} differs from expected ${pendingTx.signer}`,
    );
  }

  const requestKind = pendingTx.requestKind ?? "solana_sign";
  console.log(`Kind:    ${requestKind}`);
  console.log(`Tx:      ${pendingTx.id}`);
  if (pendingTx.cluster) console.log(`Cluster: ${pendingTx.cluster}`);
  if (pendingTx.description) console.log(`Desc:    ${pendingTx.description}`);
  console.log(`Signer:  ${keypair.publicKey.toBase58()}`);
  console.log();

  if (requestKind === "solana_sign_message") {
    if (!pendingTx.message) {
      throw new Error("Solana message-sign request is missing message bytes.");
    }
    const outcome = signSolanaMessage(pendingTx.message, keypair);
    console.log(
      `✅ Signed message! signature: ${outcome.signatureBase64.slice(0, 24)}...`,
    );
    await session.resolve(pendingTx.agentRequestId, {
      kind: "signing",
      signatures: [outcome.signatureBase64],
    });
    cli.addSignedSolTx({
      id: pendingTx.id,
      agentRequestId: pendingTx.agentRequestId,
      requestKind,
      signer: outcome.signer,
      signature: outcome.signatureBase64,
      cluster: pendingTx.cluster,
      description: pendingTx.description,
      timestamp: Date.now(),
    });
    cli.removePendingSolTx(pendingTx.id);
    console.log("Backend notified.");
    return;
  }

  const batchTransactions = (
    pendingTx.payload as {
      transactions?: Array<{
        id: string;
        unsignedTx: string;
        description?: string;
      }>;
    }
  ).transactions;
  if (
    pendingTx.agentRequestId &&
    (requestKind === "solana_send" || requestKind === "solana_sign_and_send") &&
    batchTransactions &&
    batchTransactions.length > 1
  ) {
    const rpcUrl = config.chainRpcUrl ?? defaultSolanaRpcUrl(pendingTx.cluster);
    const connection = new Connection(rpcUrl, "confirmed");
    const legs: WalletSolanaLegResult[] = [];
    let lastSubmitted:
      | { signature: string; signedTx: string; signer: string }
      | undefined;

    for (const [index, transaction] of batchTransactions.entries()) {
      try {
        const outcome = signSolanaTransaction(transaction.unsignedTx, keypair);
        const signature = await connection.sendRawTransaction(
          Buffer.from(outcome.signedTxBase64, "base64"),
          { skipPreflight: false, maxRetries: 3 },
        );
        const confirmation = await connection.confirmTransaction(
          signature,
          "confirmed",
        );
        if (confirmation.value.err) {
          throw new Error(
            `Solana transaction ${signature} failed: ${JSON.stringify(confirmation.value.err)}`,
          );
        }
        legs.push({
          id: transaction.id,
          status: "submitted",
          signature,
          signedTx: outcome.signedTxBase64,
        });
        lastSubmitted = {
          signature,
          signedTx: outcome.signedTxBase64,
          signer: outcome.signer,
        };
        cli.addSignedSolTx({
          id: `${pendingTx.id}:${transaction.id}`,
          agentRequestId: pendingTx.agentRequestId,
          requestKind,
          signedTx: outcome.signedTxBase64,
          signer: outcome.signer,
          signature,
          cluster: pendingTx.cluster,
          description: transaction.description ?? pendingTx.description,
          timestamp: Date.now(),
        });
      } catch (error) {
        legs.push({
          id: transaction.id,
          status: "failed",
          reason: error instanceof Error ? error.message : "Request failed",
        });
        legs.push(
          ...batchTransactions.slice(index + 1).map((remaining) => ({
            id: remaining.id,
            status: "skipped" as const,
          })),
        );
        break;
      }
    }

    if (!lastSubmitted) {
      throw new Error(
        legs.find((leg) => leg.reason)?.reason ??
          "No Solana batch transaction confirmed",
      );
    }
    await session.resolve(pendingTx.agentRequestId, {
      kind: requestKind,
      signature: lastSubmitted.signature,
      signedTx: lastSubmitted.signedTx,
      legs,
    });
    cli.removePendingSolTx(pendingTx.id);
    console.log(
      `✅ Confirmed ${legs.filter((leg) => leg.status === "submitted").length}/${batchTransactions.length} Solana batch transactions.`,
    );
    console.log("Backend notified.");
    return;
  }

  if (!pendingTx.unsignedTx) {
    throw new Error(
      "Solana transaction request is missing unsigned transaction bytes.",
    );
  }
  const outcome = signSolanaTransaction(pendingTx.unsignedTx, keypair);
  console.log(
    `✅ Signed! signed_tx: ${outcome.signedTxBase64.slice(0, 24)}... (${outcome.signedTxBase64.length} chars)`,
  );

  let signature: string | undefined;
  if (requestKind === "solana_send" || requestKind === "solana_sign_and_send") {
    const rpcUrl = config.chainRpcUrl ?? defaultSolanaRpcUrl(pendingTx.cluster);
    const connection = new Connection(rpcUrl, "confirmed");
    signature = await connection.sendRawTransaction(
      Buffer.from(outcome.signedTxBase64, "base64"),
      { skipPreflight: false, maxRetries: 3 },
    );
    const confirmation = await connection.confirmTransaction(
      signature,
      "confirmed",
    );
    if (confirmation.value.err) {
      throw new Error(
        `Solana transaction ${signature} failed: ${JSON.stringify(confirmation.value.err)}`,
      );
    }
    console.log(`✅ Confirmed! signature: ${signature}`);
    await session.resolve(pendingTx.agentRequestId, {
      kind: requestKind,
      signature,
      signedTx: outcome.signedTxBase64,
    });
  } else {
    await session.resolve(pendingTx.agentRequestId, {
      kind: "signing",
      signatures: [outcome.signedTxBase64],
    });
  }

  cli.addSignedSolTx({
    id: pendingTx.id,
    agentRequestId: pendingTx.agentRequestId,
    requestKind,
    signedTx: outcome.signedTxBase64,
    signer: outcome.signer,
    signature,
    cluster: pendingTx.cluster,
    description: pendingTx.description,
    timestamp: Date.now(),
  });
  cli.removePendingSolTx(pendingTx.id);

  console.log("Backend notified.");
}

function defaultSolanaRpcUrl(cluster: string | undefined): string {
  if (cluster?.includes("devnet")) return "https://api.devnet.solana.com";
  if (cluster?.includes("testnet")) return "https://api.testnet.solana.com";
  return "https://api.mainnet-beta.solana.com";
}

async function executeCliTransaction(params: {
  privateKey: `0x${string}`;
  currentChainId: number;
  chainsById: Record<number, Chain>;
  rpcUrl?: string;
  callList: ReturnType<typeof pendingTxToCallList>;
}): Promise<ExecutionResult> {
  const { privateKey, currentChainId, chainsById, rpcUrl, callList } = params;
  const unsupportedWalletMethod = async (): Promise<never> => {
    throw new Error("wallet_client_path_unavailable_in_cli_private_key_mode");
  };

  return executeWalletCalls({
    callList,
    currentChainId,
    capabilities: undefined,
    localPrivateKey: privateKey,
    sendCallsSyncAsync: unsupportedWalletMethod,
    sendTransactionAsync: unsupportedWalletMethod,
    switchChainAsync: async () => undefined,
    chainsById,
    getPreferredRpcUrl: (resolvedChain) =>
      getPreferredRpcUrl(resolvedChain, rpcUrl),
  });
}

function serviceFeePayload(
  record: SignedTx,
): Record<string, unknown> | undefined {
  if (!record.serviceFeeStatus) return undefined;
  return {
    status: record.serviceFeeStatus,
    amount_wei: record.serviceFeeAmountWei,
    recipient: record.serviceFeeRecipient,
    ...(record.serviceFeeTxHash ? { tx_hash: record.serviceFeeTxHash } : {}),
    ...(record.serviceFeeError ? { error: record.serviceFeeError } : {}),
    retryable: false,
  };
}

async function recoverConfirmedTransactions(params: {
  cli: CliSession;
  session: ReturnType<CliSession["createClientSession"]>;
  records: SignedTx[];
}): Promise<void> {
  const { cli, session, records } = params;
  if (records.some((record) => !record.agentRequestId)) {
    fatal(
      "A confirmed wallet record predates Agent v1 and cannot be replayed. Start a new Agent turn instead.",
    );
  }
  let replayed = 0;
  for (const record of records) {
    if (!record.agentRequestId || !record.txHash) continue;
    await session.fetchCurrentState();
    const pending = session
      .getPendingRequests()
      .find((request) => request.id === record.agentRequestId);
    if (pending) {
      const hashes = record.txHashes?.length
        ? record.txHashes
        : [record.txHash];
      await session.resolve(record.agentRequestId, {
        kind: "transaction",
        txHash: record.txHash,
        txHashes: hashes,
        completedTxIds: hashes.map((_, index) => index + 1),
      });
      replayed += 1;
    }
    cli.markSignedAgentActionNotified(record.agentRequestId);
  }

  if (replayed > 0) {
    console.log(
      `Backend notification recovered for ${replayed} confirmed transaction${replayed === 1 ? "" : "s"}; no transaction was rebroadcast.`,
    );
  } else {
    console.log(
      "Transaction already confirmed; no transaction was rebroadcast.",
    );
  }
}

export async function signCommand(
  config: CliConfig,
  txIds: string[],
): Promise<void> {
  if (txIds.length === 0) {
    fatal(
      "Usage: aomi tx sign <tx-id> [<tx-id> ...]\nRun `aomi tx list` to see pending transaction IDs.",
    );
  }
  const uniqueIds = Array.from(new Set(txIds));
  if (uniqueIds.length !== txIds.length) {
    fatal(
      "Duplicate transaction IDs are not allowed in a single `aomi tx sign` call.",
    );
  }

  // Client-side AA execution was removed — the backend AA lane executes
  // smart-account transactions. The `--aa*` flags still record the AA
  // preference in user_state so the backend routes accordingly.
  if (config.execution === "aa") {
    fatal(
      "AA execution now runs in the backend lane (rolling out); use --eoa for local execution.",
    );
  }

  const cli = CliSession.load();
  if (!cli) {
    fatal("No active session. Run `aomi chat` first.");
  }

  // EVM private key is only required when the targeted pending tx is
  // EVM/EIP-712 kind. Solana sign requests use a separate keypair flag.
  const privateKey = config.privateKey ?? cli.privateKey;

  cli.mergeConfig(config);
  const session = cli.createClientSession(config);

  try {
    await session.fetchCurrentState();
    const preAgentIds = uniqueIds.filter((id) => {
      const record =
        cli.findPendingTx(id) ??
        cli.findPendingSolTx(id) ??
        cli.findSignedTransaction(id);
      return record && !record.agentRequestId;
    });
    if (preAgentIds.length > 0) {
      fatal(
        `Wallet request${preAgentIds.length === 1 ? "" : "s"} ${preAgentIds.join(", ")} predate Agent v1 and cannot be submitted. Start a new Agent turn to recreate them.`,
      );
    }

    // EVM and SVM have independent backend id spaces, so the default dual-chain
    // runtime can legitimately have both `evm:tx-1` and `svm:tx-1` pending.
    // Legacy unqualified ids remain accepted whenever they are unambiguous.
    const solanaIds = uniqueIds.filter(
      (id) => cli.findPendingSolTx(id) !== undefined,
    );
    const evmIds = uniqueIds.filter(
      (id) =>
        cli.findPendingTx(id) !== undefined ||
        cli.findSignedTransaction(id) !== undefined,
    );
    const unknownIds = uniqueIds.filter(
      (id) =>
        cli.findPendingSolTx(id) === undefined &&
        cli.findPendingTx(id) === undefined &&
        cli.findSignedTransaction(id) === undefined,
    );
    const ambiguousIds = uniqueIds.filter(
      (id) =>
        !id.includes(":") &&
        cli.findPendingSolTx(id) !== undefined &&
        (cli.findPendingTx(id) !== undefined ||
          cli.findSignedTransaction(id) !== undefined),
    );
    if (ambiguousIds.length > 0) {
      fatal(
        `Ambiguous transaction ${ambiguousIds.join(", ")}. Use the chain-qualified selector shown by \`aomi tx list\` (for example \`evm:tx-1\` or \`svm:tx-1\`).`,
      );
    }
    if (unknownIds.length > 0) {
      const available = cli.pendingSelectors().join(", ") || "(none)";
      const label = unknownIds.length === 1 ? "Transaction" : "Transactions";
      fatal(
        `${label} "${unknownIds.join('", "')}" not found.\nAvailable: ${available}`,
      );
    }
    if (solanaIds.length > 0 && evmIds.length > 0) {
      fatal(
        "Cannot mix Solana and EVM/EIP-712 requests in the same `aomi tx sign` invocation.",
      );
    }

    // Solana requests execute sequentially because each has an independent
    // blockhash and callback. A later failure cannot roll back an earlier send.
    if (solanaIds.length > 0) {
      if (solanaIds.length > 1) {
        console.log(
          `${DIM}Solana requests execute sequentially; confirmed transactions are not rolled back if a later request fails.${RESET}`,
        );
      }
      const pendingSolana = solanaIds.map((id) => cli.requirePendingSolTx(id));
      for (const pendingTx of pendingSolana) {
        await signSolanaPending({ cli, session, config, pendingTx });
      }
      return;
    }

    const confirmedRecords = uniqueIds.flatMap((id) => {
      const record = cli.findSignedTransaction(id);
      return record ? [record] : [];
    });
    if (confirmedRecords.length > 0) {
      if (confirmedRecords.length !== uniqueIds.length) {
        fatal(
          "Confirmed and unconfirmed transactions cannot be mixed in one retry. Sign the remaining pending IDs separately.",
        );
      }
      await recoverConfirmedTransactions({
        cli,
        session,
        records: confirmedRecords,
      });
      return;
    }

    // EVM / EIP-712 branch.
    const pendingTxs = cli.requirePendingTxs(uniqueIds);
    const agentRequestIds = Array.from(
      new Set(
        pendingTxs.flatMap((tx) =>
          tx.agentRequestId ? [tx.agentRequestId] : [],
        ),
      ),
    );
    if (
      agentRequestIds.length !== 1 ||
      pendingTxs.some((tx) => !tx.agentRequestId)
    ) {
      fatal(
        "Every wallet request in a sign call must belong to one Agent v1 action.",
      );
    }
    const agentRequestId = agentRequestIds[0]!;
    if (!privateKey) {
      fatal(
        [
          "Private key required for `aomi tx sign`.",
          "Pass one of:",
          "  aomi wallet set <hex-key>",
          "  aomi tx sign --private-key <hex-key> <tx-id>",
          "  PRIVATE_KEY=<hex-key> aomi tx sign <tx-id>",
        ].join("\n"),
      );
    }
    const account = privateKeyToAccount(privateKey as `0x${string}`);

    if (
      cli.publicKey &&
      account.address.toLowerCase() !== cli.publicKey.toLowerCase()
    ) {
      console.log(
        `⚠️  Signer ${account.address} differs from session public key ${cli.publicKey}`,
      );
      console.log("   Updating session to match the signing key...");
    }

    const rpcUrl = config.chainRpcUrl;
    const resolvedChainIds = pendingTxs.map(
      (tx) => tx.chainId ?? cli.chainId ?? 1,
    );
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

    let signedRecords: SignedTx[] = [];
    let agentResult: WalletRequestResult | undefined;
    let partialFailureReason: string | undefined;

    if (pendingTxs.every((tx) => tx.kind === "transaction")) {
      console.log(
        `Kind:    transaction${pendingTxs.length > 1 ? " (batch)" : ""}`,
      );
      for (const tx of pendingTxs) {
        console.log(`Tx:      ${tx.id} -> ${tx.to}`);
        if (tx.value) console.log(`Value:   ${tx.value}`);
        if (tx.chainId ?? cli.chainId)
          console.log(`Chain:   ${tx.chainId ?? cli.chainId}`);
        if (tx.data) {
          console.log(`Data:    ${tx.data.slice(0, 40)}...`);
        }
      }
      console.log();

      const baseCallList = pendingTxs.flatMap((tx, index) =>
        pendingTxToCallList({
          ...tx,
          chainId: resolvedChainIds[index],
        }),
      );
      if (
        baseCallList.length > 1 &&
        rpcUrl &&
        new Set(baseCallList.map((call) => call.chainId)).size > 1
      ) {
        fatal(
          "A single `--rpc-url` override cannot be used for a mixed-chain multi-sign request.",
        );
      }

      session.resolveWallet(account.address, primaryChainId);
      await session.syncUserState();

      // Simulate batch to validate and compute service fee.
      let simFee: AomiSimulateFee | undefined;
      try {
        const sim = await simulatePendingTransactions({
          session,
          cli,
          pendingTxs,
          resolvedChainIds,
          chainId: primaryChainId,
        });
        if (!sim.batch_success) {
          const failed = sim.steps.find((s) => !s.success);
          console.log(
            `\x1b[31m❌ Simulation failed at step ${failed?.step ?? "?"}: ${failed?.revert_reason ?? "unknown"}${RESET}`,
          );
        }
        simFee = sim.fee;
      } catch (e) {
        if (e instanceof CliExit) throw e;
        console.log(
          `${DIM}Simulation unavailable, skipping fee injection.${RESET}`,
        );
      }

      // Fee validation is outside the try/catch so failures abort instead
      // of being silently swallowed.
      let normalizedFee: NormalizedSimulatedFee | null = null;
      let autoFeeCall: ReturnType<typeof buildFeeAAWalletCall> = null;
      if (simFee) {
        normalizedFee = normalizeSimulatedFee(simFee);
        if (normalizedFee) {
          console.log(
            `Fee:     ${formatEther(normalizedFee.amountWei)} ETH (${normalizedFee.amountWei} wei) → ${normalizedFee.recipient}`,
          );
        }
        autoFeeCall = buildFeeAAWalletCall(simFee, primaryChainId);
      }

      const executionCallList = autoFeeCall
        ? [...baseCallList, autoFeeCall]
        : baseCallList;

      console.log("Exec:    eoa");

      let execution: ExecutionResult;
      let failedCallIndex: number | undefined;
      try {
        execution = await executeCliTransaction({
          privateKey: privateKey as `0x${string}`,
          currentChainId: primaryChainId,
          chainsById,
          rpcUrl,
          callList: executionCallList,
        });
      } catch (error) {
        const partial = partialWalletExecution(error);
        if (!partial) throw error;
        execution = {
          txHash:
            partial.completedTxHashes[partial.completedTxHashes.length - 1],
          txHashes: partial.completedTxHashes,
          executionKind: "eoa",
          batched: partial.completedTxHashes.length > 1,
          sponsored: false,
        };
        partialFailureReason = partial.failureReason;
        failedCallIndex = partial.failedCallIndex;
      }
      if (
        !partialFailureReason &&
        execution.txHashes.length !== executionCallList.length
      ) {
        throw new Error("wallet_execution_hash_count_mismatch");
      }

      // Local EOA execution sends calls sequentially. When the backend quoted a
      // service fee, that fee is appended after the user's calls, so the raw
      // execution's last/primary hash belongs to the fee transfer. Keep the
      // wallet-facing record and callback anchored to the requested action;
      // the fee hash remains visible separately for auditability.
      const actionTxHashes = execution.txHashes.slice(0, baseCallList.length);
      const feeTxHash = autoFeeCall
        ? execution.txHashes[baseCallList.length]
        : undefined;
      const confirmedPendingTxs = pendingTxs.slice(0, actionTxHashes.length);
      if (confirmedPendingTxs.length === 0) {
        throw new Error(
          partialFailureReason ?? "No requested transaction confirmed",
        );
      }
      console.log(
        `✅ Sent! Hash: ${actionTxHashes[actionTxHashes.length - 1]}`,
      );
      if (actionTxHashes.length > 1) {
        console.log(`Count:   ${actionTxHashes.length}`);
      }
      if (feeTxHash) console.log(`Fee tx:  ${feeTxHash}`);

      const feeStatus = !autoFeeCall
        ? undefined
        : feeTxHash
          ? "confirmed"
          : failedCallIndex === baseCallList.length
            ? "failed"
            : "not_attempted";
      signedRecords = confirmedPendingTxs.map((tx, index) => {
        const actionExecution: ExecutionResult = {
          ...execution,
          txHash: actionTxHashes[index],
          txHashes: [actionTxHashes[index]],
          batched: false,
        };
        return {
          ...toSignedTransactionRecord(
            tx,
            actionExecution,
            account.address,
            resolvedChainIds[index],
            Date.now(),
          ),
          backendNotified: false,
          agentRequestId: tx.agentRequestId,
          ...(normalizedFee && feeStatus
            ? {
                serviceFeeStatus: feeStatus,
                serviceFeeAmountWei: normalizedFee.amountWei.toString(),
                serviceFeeRecipient: normalizedFee.recipient,
                serviceFeeTxHash: feeTxHash,
                serviceFeeError:
                  feeStatus === "confirmed" ? undefined : partialFailureReason,
              }
            : {}),
        };
      });
      if (agentRequestId) {
        const completedTxIds = actionTxHashes.map((_, index) => index + 1);
        const failedTxIds = baseCallList
          .slice(actionTxHashes.length)
          .map((_, index) => actionTxHashes.length + index + 1);
        agentResult = {
          kind: "transaction",
          txHash: actionTxHashes[actionTxHashes.length - 1],
          txHashes: actionTxHashes,
          completedTxIds,
          failedTxIds,
          failureReason: partialFailureReason,
          batched: baseCallList.length > 1,
          callCount: baseCallList.length,
        };
      }
      const remainingTxIds = pendingTxs
        .slice(confirmedPendingTxs.length)
        .flatMap((tx) => (tx.txId === undefined ? [] : [tx.txId]));
      void remainingTxIds;
    } else {
      if (pendingTxs.length > 1) {
        fatal(
          "Batch signing is only supported for transaction requests, not EIP-712 requests.",
        );
      }

      const pendingTx = pendingTxs[0];
      const walletClient = createWalletClient({
        account,
        chain,
        transport: http(resolvedRpcUrl),
      });
      const signaturePayload = pendingTx.payload as WalletEip712Payload;
      let signArgs = toViemSignTypedDataArgs(signaturePayload);
      const messageArgs = toViemSignMessageArgs(signaturePayload);

      if (signArgs && messageArgs) {
        fatal(
          "Signature request cannot include both typed_data and non_typed_data.",
        );
      }
      if (!signArgs && !messageArgs) {
        fatal(
          "Signature request is missing typed_data or non_typed_data payload.",
        );
      }

      if (pendingTx.description) {
        console.log(`Desc:    ${pendingTx.description}`);
      }
      console.log(
        signArgs ? `Type:    ${signArgs.primaryType}` : "Type:    erc191",
      );
      console.log();

      const signature = signArgs
        ? await walletClient.signTypedData(signArgs as never)
        : await walletClient.signMessage(messageArgs as never);

      console.log(`✅ Signed! Signature: ${signature.slice(0, 20)}...`);

      signedRecords = [
        {
          id: pendingTx.id,
          agentRequestId: pendingTx.agentRequestId,
          kind: "eip712_sign",
          signature,
          from: account.address,
          description: pendingTx.description,
          timestamp: Date.now(),
        },
      ];
      if (agentRequestId) {
        agentResult = { kind: "signing", signatures: [signature] };
      }
    }

    // Persist confirmed chain outcomes before the callback. If the process or
    // network dies after this point, a retry replays only the callback and can
    // never rebroadcast the recorded staged id.
    cli.setPublicKey(account.address);
    session.resolveWallet(account.address, primaryChainId);
    for (const signedRecord of signedRecords) {
      cli.addSignedTx(signedRecord);
    }

    if (agentResult) {
      await session.resolve(agentRequestId, agentResult);
      cli.markSignedAgentActionNotified(agentRequestId);
    }
    console.log("Backend notified.");
    const failedFee = signedRecords.find(
      (record) => record.serviceFeeStatus === "failed",
    );
    if (failedFee) {
      fatal(
        [
          `⚠️  Partial execution: action confirmed as ${failedFee.txHash}; service fee failed: ${failedFee.serviceFeeError ?? "unknown error"}.`,
          "The action is finalized and was removed from pending. Do not run `aomi tx sign` for this staged ID again.",
          "No automatic fee-only retry is available; reconcile the fee separately with an operator using the recorded amount and recipient.",
        ].join("\n"),
      );
    }
    if (partialFailureReason) {
      const confirmedIds = signedRecords.map((record) => record.id).join(", ");
      fatal(
        [
          `⚠️  Partial execution: confirmed ${confirmedIds}; a later action failed: ${partialFailureReason}.`,
          "Confirmed IDs were removed from pending and will not be rebroadcast.",
          "Run `aomi tx list`, then retry only the IDs that remain pending.",
        ].join("\n"),
      );
    }
  } catch (err) {
    if (err instanceof CliExit) throw err;
    const errMsg = err instanceof Error ? err.message : String(err);
    fatal(`❌ Signing failed: ${errMsg}`);
  } finally {
    session.close();
  }
}
