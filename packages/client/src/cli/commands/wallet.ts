import { type Chain, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as viemChains from "viem/chains";
import {
  buildFeeAAWalletCall,
  normalizeSimulatedFee,
  executeWalletCalls,
  type ExecutionResult,
} from "../../aa";
import {
  aaModeFromExecutionKind,
} from "../../aa/policy";
import {
  toViemSignTypedDataArgs,
  type WalletEip712Payload,
} from "../../wallet-utils";
import type { AomiSimulateFee, AomiSimulateResponse } from "../../types";
import { CliSession } from "../cli-session";
import { CliExit, fatal } from "../errors";
import { parseSolanaKeypairSecret, signSolanaTransaction } from "../solana-signer";
import {
  createCliProviderState,
  describeExecutionDecision,
  getAlternativeAAMode,
  resolveCliExecutionDecision,
  type CliExecutionDecision,
} from "../execution";
import { DIM, GREEN, RESET, printDataFileLocation } from "../output";
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
import { ALCHEMY_CHAIN_SLUGS } from "../../chains";
import { resolveAlchemyApiKey } from "../../aa/alchemy/defaults";

export async function txCommand(): Promise<void> {
  const cli = CliSession.load();
  if (!cli) {
    console.log("No active session");
    printDataFileLocation();
    return;
  }

  const session = cli.createClientSession();
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
  const signed = [...cli.signedTxs];
  const signedSol = [...cli.signedSolTxs];

  const totalPending = pending.length + pendingSol.length;
  const totalSigned = signed.length + signedSol.length;

  if (totalPending === 0 && totalSigned === 0) {
    console.log("No transactions.");
    printDataFileLocation();
    return;
  }

  if (totalPending > 0) {
    console.log(`Pending (${totalPending}):`);
    for (const tx of pending) {
      console.log(formatTxLine(tx, "  ⏳"));
    }
    for (const tx of pendingSol) {
      console.log(formatPendingSolTxLine(tx, "  ⏳"));
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

  printDataFileLocation();
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

  const alchemyApiKey = resolveAlchemyApiKey();
  const alchemyChainSlug = ALCHEMY_CHAIN_SLUGS[chain.id];
  if (alchemyApiKey && alchemyChainSlug) {
    return `https://${alchemyChainSlug}.g.alchemy.com/v2/${alchemyApiKey}`;
  }

  return (
    chain.rpcUrls.default.http[0] ??
    chain.rpcUrls.public?.http[0] ??
    ""
  );
}

function buildCliTxCompletionMetadata(params: {
  requestedDecision: CliExecutionDecision;
  finalDecision: CliExecutionDecision;
  execution: ExecutionResult;
}): {
  aa_requested_mode: "4337" | "7702" | "none";
  aa_resolved_mode: "4337" | "7702" | "none";
  aa_fallback_reason: string | undefined;
} {
  const requestedMode =
    params.requestedDecision.execution === "aa"
      ? params.requestedDecision.aaMode
      : "none";
  const resolvedMode =
    aaModeFromExecutionKind(params.execution.executionKind) ??
    (params.finalDecision.execution === "aa" ? params.finalDecision.aaMode : "none");

  let fallbackReason: string | undefined;
  if (requestedMode === "7702" && resolvedMode === "4337") {
    fallbackReason = "requested_7702_fallback_4337";
  } else if (requestedMode !== "none" && resolvedMode === "none") {
    fallbackReason = "aa_failed_fallback_eoa";
  }

  return {
    aa_requested_mode: requestedMode,
    aa_resolved_mode: resolvedMode,
    aa_fallback_reason: fallbackReason,
  };
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
 * Drive the Solana sign branch end-to-end:
 *   1. Load + parse the local Solana keypair from `--solana-private-key`
 *      (or `SOLANA_PRIVATE_KEY` env).
 *   2. Sign the base64 unsigned tx in place.
 *   3. Post `wallet::solana_sign_complete` to the backend with the signed
 *      bytes, so the agent's bound `signed_tx` artifact resolves and any
 *      `submit_*` continuation can fire.
 *   4. Persist the signed record locally for `aomi tx list`.
 *
 * Singular by design — host doesn't batch Solana signs. The host's
 * `domain.svm.address` is informational; this CLI path always signs with
 * whatever keypair the user provided. We do warn on mismatch.
 */
async function signSolanaPending(params: {
  cli: CliSession;
  session: ReturnType<CliSession["createClientSession"]>;
  config: CliConfig;
  pendingTx: PendingSolTx;
}): Promise<void> {
  const { cli, session, config, pendingTx } = params;
  const secret = config.solanaPrivateKey ?? process.env.SOLANA_PRIVATE_KEY;
  if (!secret) {
    fatal(
      [
        "Solana keypair required for `aomi tx sign` on a solana_sign request.",
        "Pass one of:",
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

  console.log(`Kind:    solana_sign`);
  console.log(`Tx:      ${pendingTx.id}`);
  if (pendingTx.cluster) console.log(`Cluster: ${pendingTx.cluster}`);
  if (pendingTx.description) console.log(`Desc:    ${pendingTx.description}`);
  console.log(`Signer:  ${keypair.publicKey.toBase58()}`);
  console.log();

  const outcome = signSolanaTransaction(pendingTx.unsignedTx, keypair);
  console.log(
    `✅ Signed! signed_tx: ${outcome.signedTxBase64.slice(0, 24)}... (${outcome.signedTxBase64.length} chars)`,
  );

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
  );

  // Re-sync to drop the now-discarded pending entry on the host side.
  const syncedState = await session.syncUserState();
  cli.syncPendingFromUserState(syncedState.user_state);

  cli.addSignedSolTx({
    id: pendingTx.id,
    signedTx: outcome.signedTxBase64,
    signer: outcome.signer,
    cluster: pendingTx.cluster,
    description: pendingTx.description,
    timestamp: Date.now(),
  });

  console.log("Backend notified.");
}

async function executeCliTransaction(params: {
  privateKey: `0x${string}`;
  currentChainId: number;
  chainsById: Record<number, Chain>;
  rpcUrl?: string;
  providerState: Awaited<ReturnType<typeof createCliProviderState>>;
  callList: ReturnType<typeof pendingTxToCallList>;
}): Promise<ExecutionResult> {
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


export async function signCommand(config: CliConfig, txIds: string[]): Promise<void> {
  if (txIds.length === 0) {
    fatal(
      "Usage: aomi tx sign <tx-id> [<tx-id> ...]\nRun `aomi tx list` to see pending transaction IDs.",
    );
  }
  const uniqueIds = Array.from(new Set(txIds));
  if (uniqueIds.length !== txIds.length) {
    fatal("Duplicate transaction IDs are not allowed in a single `aomi tx sign` call.");
  }

  const cli = CliSession.load();
  if (!cli) {
    fatal("No active session. Run `aomi chat` first.");
  }

  // EVM private key is only required when the targeted pending tx is
  // EVM/EIP-712 kind. Solana sign requests use a separate keypair flag.
  const privateKey = config.privateKey ?? cli.privateKey;

  cli.mergeConfig(config);
  const session = cli.createClientSession();

  try {
    const initialState = await session.client.fetchState(
      cli.sessionId,
      undefined,
      cli.clientId,
    );
    cli.syncPendingFromUserState(initialState.user_state);

    // Membership check: each requested id resolves to exactly one of the
    // two authoritative arrays (EVM/EIP-712 or Solana) — backend ids are
    // unique across kinds. Mixing kinds in a single invocation is a UX
    // error, so dispatch wholesale.
    const solanaIds = uniqueIds.filter((id) => cli.findPendingSolTx(id) !== undefined);
    const evmIds = uniqueIds.filter((id) => cli.findPendingTx(id) !== undefined);
    const unknownIds = uniqueIds.filter(
      (id) =>
        cli.findPendingSolTx(id) === undefined &&
        cli.findPendingTx(id) === undefined,
    );
    if (unknownIds.length > 0) {
      const available =
        [...cli.pendingTxs, ...cli.pendingSolTxs].map((tx) => tx.id).join(", ") || "(none)";
      const label = unknownIds.length === 1 ? "Transaction" : "Transactions";
      fatal(`${label} "${unknownIds.join('", "')}" not found.\nAvailable: ${available}`);
    }
    if (solanaIds.length > 0 && evmIds.length > 0) {
      fatal(
        "Cannot mix Solana and EVM/EIP-712 requests in the same `aomi tx sign` invocation.",
      );
    }

    // Solana sign branch: singular, no EVM key, no chain/RPC needed.
    if (solanaIds.length > 0) {
      if (solanaIds.length > 1) {
        fatal(
          "Solana signing is singular — pass exactly one tx-id at a time.",
        );
      }
      const solanaTx = cli.requirePendingSolTx(solanaIds[0]);
      await signSolanaPending({
        cli,
        session,
        config,
        pendingTx: solanaTx,
      });
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
    const resolvedChainIds = pendingTxs.map((tx) => tx.chainId ?? cli.chainId ?? 1);
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
    let backendNotifications: Array<{ type: string; payload: Record<string, unknown> }> = [];
    let resolvedUserStateAAMode: "4337" | "7702" | null = null;
    let resolvedUserStateSmartAccount: string | null = null;

    if (pendingTxs.every((tx) => tx.kind === "transaction")) {
      console.log(`Kind:    transaction${pendingTxs.length > 1 ? " (batch)" : ""}`);
      for (const tx of pendingTxs) {
        console.log(`Tx:      ${tx.id} -> ${tx.to}`);
        if (tx.value) console.log(`Value:   ${tx.value}`);
        if (tx.chainId ?? cli.chainId) console.log(`Chain:   ${tx.chainId ?? cli.chainId}`);
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
        fatal("A single `--rpc-url` override cannot be used for a mixed-chain multi-sign request.");
      }

      const simulationDecision = resolveCliExecutionDecision({
        config,
        chain,
        callList: baseCallList,
      });
      const simulationProviderState =
        simulationDecision.execution === "aa"
          ? await createCliProviderState({
              decision: simulationDecision,
              chain,
              privateKey: privateKey as `0x${string}`,
              rpcUrl: resolvedRpcUrl,
              callList: baseCallList,
              baseUrl: cli.baseUrl,
            })
          : undefined;
      const simulationAAMode =
        simulationDecision.execution === "aa" ? simulationDecision.aaMode : null;
      const simulationSmartAccount =
        simulationAAMode === "4337"
          ? simulationProviderState?.account?.AAAddress ??
            simulationProviderState?.account?.executionAddress ??
            null
          : null;

      session.resolveWallet(account.address, primaryChainId, {
        aaMode: simulationAAMode,
        smartAccount: simulationSmartAccount,
      });
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

      const decisionCallList = autoFeeCall
        ? [...baseCallList, autoFeeCall]
        : baseCallList;

      const decision = resolveCliExecutionDecision({
        config,
        chain,
        callList: decisionCallList,
      });
      console.log(`Exec:    ${describeExecutionDecision(decision)}`);

      // Build ordered list of strategies to attempt.
      // With --aa: [primary, alt] — fatal if both fail, no EOA.
      // Auto mode: [primary, alt, eoa] — transparently fall through to EOA.
      const strategies: CliExecutionDecision[] = [decision];
      const altDecision = getAlternativeAAMode(decision);
      if (altDecision) strategies.push(altDecision);
      if (config.execution !== "aa") strategies.push({ execution: "eoa" });

      const runWithDecision = async (d: CliExecutionDecision) => {
        const ps = await createCliProviderState({
          decision: d,
          chain,
          privateKey: privateKey as `0x${string}`,
          rpcUrl: resolvedRpcUrl,
          callList: decisionCallList,
          baseUrl: cli.baseUrl,
        });

        let executionCallList = decisionCallList;
        if (autoFeeCall && d.execution === "aa" && ps.resolved?.sponsorship !== "disabled") {
          console.log(
            `${DIM}Skipping native fee injection for sponsored AA. The paymaster covers gas only; a native fee transfer would require sender balance.${RESET}`,
          );
          executionCallList = baseCallList;
        }

        return executeCliTransaction({
          privateKey: privateKey as `0x${string}`,
          currentChainId: primaryChainId,
          chainsById,
          rpcUrl,
          providerState: ps,
          callList: executionCallList,
        });
      };

      let finalDecision: CliExecutionDecision = decision;
      let execution!: ExecutionResult;
      const failures: Array<{ decision: CliExecutionDecision; message: string }> = [];

      for (const strategy of strategies) {
        if (failures.length > 0) {
          const prev = strategies[failures.length - 1]!;
          console.log(`${describeExecutionDecision(prev)} failed: ${failures[failures.length - 1]!.message}`);
          console.log(`Retrying with ${describeExecutionDecision(strategy)}...`);
        }
        try {
          execution = await runWithDecision(strategy);
          finalDecision = strategy;
          break;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          failures.push({ decision: strategy, message });
          if (strategy === strategies[strategies.length - 1]) {
            if (config.execution === "aa") {
              fatal(
                `❌ AA execution failed with all modes.\n` +
                failures.map((f) => `  ${describeExecutionDecision(f.decision)}: ${f.message}`).join("\n") +
                "\nUse `--eoa` to sign without account abstraction.",
              );
            }
            throw error;
          }
        }
      }

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

      const executionUsedAA =
        finalDecision.execution === "aa" && execution.executionKind !== "eoa";
      resolvedUserStateAAMode =
        executionUsedAA && finalDecision.execution === "aa"
          ? finalDecision.aaMode
          : null;
      resolvedUserStateSmartAccount =
        resolvedUserStateAAMode === "4337" ? execution.AAAddress ?? null : null;
      signedRecords = pendingTxs.map((tx, index) =>
        toSignedTransactionRecord(
          tx,
          execution,
          account.address,
          resolvedChainIds[index],
          Date.now(),
          executionUsedAA && finalDecision.execution === "aa"
            ? finalDecision.provider
            : undefined,
          executionUsedAA && finalDecision.execution === "aa"
            ? finalDecision.aaMode
            : undefined,
        ),
      );
      const completionMetadata = buildCliTxCompletionMetadata({
        requestedDecision: decision,
        finalDecision,
        execution,
      });
      backendNotifications = pendingTxs.map((tx) => ({
        type: "wallet:tx_complete",
        payload: {
          txHash: execution.txHash,
          status: "success",
          pending_tx_ids: tx.txId !== undefined ? [tx.txId] : [],
          ...completionMetadata,
          execution_kind: execution.executionKind,
          batched: execution.batched,
          call_count: execution.txHashes.length,
          sponsored: execution.sponsored,
          smart_account_address: execution.AAAddress,
          delegation_address: execution.delegationAddress,
        },
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
      const signArgs = toViemSignTypedDataArgs(
        pendingTx.payload as WalletEip712Payload,
      );

      if (!signArgs) {
        fatal("EIP-712 request is missing typed_data payload.");
      }

      if (pendingTx.description) {
        console.log(`Desc:    ${pendingTx.description}`);
      }
      console.log(`Type:    ${signArgs.primaryType}`);
      console.log();

      const signature = await walletClient.signTypedData(signArgs as never);

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
          ...(pendingTx.eip712Id !== undefined
            ? { pending_eip712_id: pendingTx.eip712Id }
            : {}),
        },
      }];
    }

    // Persist signer state and notify the backend with authoritative staged ids.
    cli.setPublicKey(account.address);
    session.resolveWallet(account.address, primaryChainId, {
      aaMode: resolvedUserStateAAMode,
      smartAccount: resolvedUserStateSmartAccount,
    });

    for (const backendNotification of backendNotifications) {
      await session.client.sendSystemMessage(
        cli.sessionId,
        JSON.stringify(backendNotification),
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
