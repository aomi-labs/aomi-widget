import { type Chain, createWalletClient, http } from "viem";
import { Connection } from "@solana/web3.js";
import { privateKeyToAccount } from "viem/accounts";
import * as viemChains from "viem/chains";
import {
  buildFeeAAWalletCall,
  normalizeSimulatedFee,
  executeWalletCalls,
  type ExecutionResult,
} from "../../aa";
import {
  toViemSignMessageArgs,
  toViemSignTypedDataArgs,
  type WalletEip712Payload,
} from "../../wallet-utils";
import type { AomiSimulateFee, AomiSimulateResponse } from "../../types";
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
    const apiState = await session.client.fetchState(
      cli.sessionId,
      undefined,
      cli.clientId,
    );
    cli.syncPendingFromUserState(apiState.user_state);
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
    await session.client.sendSystemMessage(
      cli.sessionId,
      JSON.stringify({
        type: "wallet::solana_sign_complete",
        payload: {
          status: "signed",
          signature: outcome.signatureBase64,
          signed_message_base64: pendingTx.message,
          signature_type: "ed25519",
          description: pendingTx.description,
          pending_svm_sig_id: pendingTx.solanaId,
        },
      }),
      { app: cli.app },
    );
    const syncedState = await session.syncUserState();
    cli.syncPendingFromUserState(syncedState.user_state);
    cli.addSignedSolTx({
      id: pendingTx.id,
      requestKind,
      signer: outcome.signer,
      signature: outcome.signatureBase64,
      cluster: pendingTx.cluster,
      description: pendingTx.description,
      timestamp: Date.now(),
    });
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
    await session.client.sendSystemMessage(
      cli.sessionId,
      JSON.stringify({
        type: "wallet:tx_complete",
        payload: {
          status: "confirmed",
          identifier: { kind: "signature", value: signature },
          pending_svm_tx_ids: pendingTx.solanaIds?.length
            ? pendingTx.solanaIds
            : [pendingTx.solanaId],
        },
      }),
      { app: cli.app },
    );
  } else {
    await session.client.sendSystemMessage(
      cli.sessionId,
      JSON.stringify({
        type: "wallet::solana_sign_complete",
        payload: {
          status: "signed",
          signed_tx: outcome.signedTxBase64,
          description: pendingTx.description,
          pending_solana_id: pendingTx.solanaId,
        },
      }),
      { app: cli.app },
    );
  }

  // Re-sync to drop the now-discarded pending entry on the host side.
  const syncedState = await session.syncUserState();
  cli.syncPendingFromUserState(syncedState.user_state);

  cli.addSignedSolTx({
    id: pendingTx.id,
    requestKind,
    signedTx: outcome.signedTxBase64,
    signer: outcome.signer,
    signature,
    cluster: pendingTx.cluster,
    description: pendingTx.description,
    timestamp: Date.now(),
  });

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
    const initialState = await session.client.fetchState(
      cli.sessionId,
      undefined,
      cli.clientId,
    );
    cli.syncPendingFromUserState(initialState.user_state);

    // EVM and SVM have independent backend id spaces, so the default dual-chain
    // runtime can legitimately have both `evm:tx-1` and `svm:tx-1` pending.
    // Legacy unqualified ids remain accepted whenever they are unambiguous.
    const solanaIds = uniqueIds.filter(
      (id) => cli.findPendingSolTx(id) !== undefined,
    );
    const evmIds = uniqueIds.filter(
      (id) => cli.findPendingTx(id) !== undefined,
    );
    const unknownIds = uniqueIds.filter(
      (id) =>
        cli.findPendingSolTx(id) === undefined &&
        cli.findPendingTx(id) === undefined,
    );
    const ambiguousIds = uniqueIds.filter(
      (id) =>
        !id.includes(":") &&
        cli.findPendingSolTx(id) !== undefined &&
        cli.findPendingTx(id) !== undefined,
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

    // EVM / EIP-712 branch.
    const pendingTxs = cli.requirePendingTxs(uniqueIds);
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
    let backendNotifications: Array<{
      type: string;
      payload: Record<string, unknown>;
    }> = [];

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
      let autoFeeCall: ReturnType<typeof buildFeeAAWalletCall> = null;
      if (simFee) {
        const normalizedFee = normalizeSimulatedFee(simFee);
        if (normalizedFee) {
          const feeEth = (Number(normalizedFee.amountWei) / 1e18).toFixed(6);
          console.log(`Fee:     ${feeEth} ETH → ${normalizedFee.recipient}`);
        }
        autoFeeCall = buildFeeAAWalletCall(simFee, primaryChainId);
      }

      const executionCallList = autoFeeCall
        ? [...baseCallList, autoFeeCall]
        : baseCallList;

      console.log("Exec:    eoa");

      const execution = await executeCliTransaction({
        privateKey: privateKey as `0x${string}`,
        currentChainId: primaryChainId,
        chainsById,
        rpcUrl,
        callList: executionCallList,
      });

      // Local EOA execution sends calls sequentially. When the backend quoted a
      // service fee, that fee is appended after the user's calls, so the raw
      // execution's last/primary hash belongs to the fee transfer. Keep the
      // wallet-facing record and callback anchored to the requested action;
      // the fee hash remains visible separately for auditability.
      let reportedExecution = execution;
      let feeTxHash: string | undefined;
      if (
        autoFeeCall &&
        execution.executionKind === "eoa" &&
        execution.txHashes.length === executionCallList.length
      ) {
        const actionTxHashes = execution.txHashes.slice(0, baseCallList.length);
        feeTxHash = execution.txHashes[baseCallList.length];
        const actionTxHash = actionTxHashes[actionTxHashes.length - 1];
        if (actionTxHash) {
          reportedExecution = {
            ...execution,
            txHash: actionTxHash,
            txHashes: actionTxHashes,
            batched: baseCallList.length > 1,
          };
        }
      }
      console.log(`✅ Sent! Hash: ${reportedExecution.txHash}`);
      if (reportedExecution.txHashes.length > 1) {
        console.log(`Count:   ${reportedExecution.txHashes.length}`);
      }
      if (feeTxHash) console.log(`Fee tx:  ${feeTxHash}`);

      signedRecords = pendingTxs.map((tx, index) =>
        toSignedTransactionRecord(
          tx,
          reportedExecution,
          account.address,
          resolvedChainIds[index],
          Date.now(),
        ),
      );
      backendNotifications = pendingTxs.map((tx) => ({
        type: "wallet:tx_complete",
        payload: {
          txHash: reportedExecution.txHash,
          status: "success",
          pending_tx_ids: tx.txId !== undefined ? [tx.txId] : [],
          aa_requested_mode: "none",
          aa_resolved_mode: "none",
          aa_fallback_reason: undefined,
          execution_kind: execution.executionKind,
          batched: reportedExecution.batched,
          call_count: reportedExecution.txHashes.length,
          ...(feeTxHash ? { service_fee_tx_hash: feeTxHash } : {}),
          sponsored: execution.sponsored,
        },
      }));
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

      // Fallback: if the local pendingTx payload is missing typed_data
      // (happens when the local state sync ran before the backend stored
      // the sig, or before bug fixes for camelCase wire format), fetch the
      // current state from the backend and reconstruct.
      if (
        !signArgs &&
        pendingTx.kind === "eip712_sign" &&
        pendingTx.eip712Id !== undefined
      ) {
        try {
          const session = cli.createClientSession(config);
          const apiState = await session.client.fetchState(
            cli.sessionId,
            undefined,
            cli.clientId,
          );
          session.close();
          const evmSigs =
            (
              apiState.user_state as {
                pending?: {
                  evmSigs?: Record<string, unknown>;
                  evm_sigs?: Record<string, unknown>;
                };
              }
            )?.pending?.evmSigs ??
            (
              apiState.user_state as {
                pending?: { evm_sigs?: Record<string, unknown> };
              }
            )?.pending?.evm_sigs ??
            {};
          const sig = (
            evmSigs as Record<
              string,
              {
                typedData?: unknown;
                typed_data?: unknown;
                description?: string;
              }
            >
          )[String(pendingTx.eip712Id)];
          const typed = sig?.typedData ?? sig?.typed_data;
          if (typed) {
            signArgs = toViemSignTypedDataArgs({
              ...(pendingTx.payload as WalletEip712Payload),
              typed_data: typed as WalletEip712Payload["typed_data"],
              description: sig.description ?? pendingTx.description,
            });
          }
        } catch (err) {
          console.warn(
            `[aomi tx sign] failed to fetch typed_data from backend: ${err}`,
          );
        }
      }

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
          kind: "eip712_sign",
          signature,
          from: account.address,
          description: pendingTx.description,
          timestamp: Date.now(),
        },
      ];
      backendNotifications = [
        {
          type: "wallet_eip712_response",
          payload: {
            status: "success",
            signature,
            description: pendingTx.description,
            ...(pendingTx.eip712Id !== undefined
              ? { pending_eip712_id: pendingTx.eip712Id }
              : {}),
          },
        },
      ];
    }

    // Persist signer state and notify the backend with authoritative staged ids.
    cli.setPublicKey(account.address);
    session.resolveWallet(account.address, primaryChainId);

    for (const backendNotification of backendNotifications) {
      await session.client.sendSystemMessage(
        cli.sessionId,
        JSON.stringify(backendNotification),
        { app: cli.app },
      );
    }

    const syncedState = await session.syncUserState();
    cli.syncPendingFromUserState(syncedState.user_state);
    for (const signedRecord of signedRecords) {
      cli.addSignedTx(signedRecord);
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
