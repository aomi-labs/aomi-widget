"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import {
  Connection as SolanaConnection,
  Transaction as SolanaLegacyTransaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { normalizeSolanaCluster } from "@aomi-labs/client";
import {
  UserState,
  appendFeeCallToPayload,
  hydrateTxPayloadFromUserState,
  parseChainId,
  useAomiRuntime,
  type WalletRequest,
  type WalletTxPayload,
} from "@aomi-labs/react";
import { useAomiWalletKit } from "../lib/wallet-kit";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

function hasHydratedCalls(payload: WalletTxPayload): boolean {
  return Array.isArray(payload.calls) && payload.calls.length > 0;
}

/**
 * Backend-owned operations are deliberately not signed automatically: the
 * dialog below is the user's authorization boundary. That covers EVM
 * sponsored ERC-4337 batches and SVM sealed transactions the backend
 * broadcasts itself; plain sign-only requests keep the silent flow.
 */
function isAttendedSigning(
  payload: Extract<WalletRequest, { kind: "signing" }>["payload"],
): boolean {
  if (payload.executionKind === "erc4337") return true;
  return (
    payload.chainFamily === "svm" &&
    payload.executionKind === "transaction" &&
    payload.broadcaster === "hosted" &&
    Boolean(payload.operationId)
  );
}

function aaFeeAssetLabel(asset: unknown): string {
  if (typeof asset !== "object" || asset === null) return "Unknown asset";
  const value = asset as { kind?: unknown; address?: unknown };
  if (value.kind === "native") return "Native";
  if (value.kind === "token" && typeof value.address === "string") {
    return value.address;
  }
  return "Unknown asset";
}

function decodeBase64(value: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64"));
  }
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function encodeBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

/**
 * The payer's ed25519 signature out of a wallet-signed Solana transaction,
 * base64-encoded. The sealed signing handoff returns only the signature —
 * the backend verifies it against the exact stored envelope and attaches it
 * itself, so the client can never substitute different bytes.
 */
function extractPayerSignature(signedTxBase64: string): string {
  const bytes = decodeBase64(signedTxBase64);
  let signature: Uint8Array | null = null;
  try {
    signature = VersionedTransaction.deserialize(bytes).signatures[0] ?? null;
  } catch {
    const legacy = SolanaLegacyTransaction.from(bytes).signature;
    signature = legacy ? new Uint8Array(legacy) : null;
  }
  if (!signature || signature.every((byte) => byte === 0)) {
    throw new Error("The signed transaction carries no payer signature");
  }
  return encodeBase64(signature);
}

function toSimulationTransactions(payload: WalletTxPayload): Array<{
  to: string;
  value?: string;
  data?: string;
  label?: string;
  chain_id?: number;
}> {
  if (Array.isArray(payload.calls) && payload.calls.length > 0) {
    return payload.calls.map((call) => ({
      to: call.to,
      value: call.value,
      data: call.data,
      label: call.description,
      chain_id: call.chainId,
    }));
  }

  if (!payload.to) {
    throw new Error("pending_transaction_missing_call_data");
  }

  return [
    {
      to: payload.to,
      value: payload.value,
      data: payload.data,
      chain_id: payload.chainId,
    },
  ];
}

/**
 * Invisible bridge component that processes broadcast transactions and the
 * chain-neutral signing handoff through the active Aomi wallet kit.
 *
 * Auto-mounted inside AomiFrame.Root.
 */
export function RuntimeTxHandler() {
  const {
    user,
    pendingWalletRequests,
    resolveWalletRequest,
    rejectWalletRequest,
    simulateBatchTransactions,
    showNotification,
  } = useAomiRuntime();
  const adapter = useAomiWalletKit();
  const { chainId: currentChainId } = adapter.identity;
  const processingRef = useRef(false);
  const [isSigningAa, setIsSigningAa] = useState(false);
  const aaRequest =
    pendingWalletRequests[0]?.kind === "signing" &&
    isAttendedSigning(pendingWalletRequests[0].payload)
      ? pendingWalletRequests[0]
      : null;

  /** Canonicalize cluster aliases and match before asking the wallet. */
  const maybeSwitchSolanaCluster = useCallback(
    async (requestedCluster: string | undefined): Promise<void> => {
      const normalizedCluster = normalizeSolanaCluster(requestedCluster);
      if (!normalizedCluster) return;
      const target = adapter.supportedNetworks?.solana?.find(
        (network) => network.cluster === normalizedCluster,
      );
      if (!target) {
        throw new Error(`Unsupported Solana cluster: ${normalizedCluster}`);
      }
      if (adapter.selectedSolanaNetwork?.id === target.id) return;
      if (!adapter.selectNetwork) {
        throw new Error(`Cannot switch the wallet to ${normalizedCluster}`);
      }
      if (adapter.solanaNetworkSwitchRequiresReconnect) {
        throw new Error(
          `Reconnect the Solana wallet on ${normalizedCluster} before signing`,
        );
      }
      try {
        await adapter.selectNetwork({
          family: "solana",
          networkId: target.id,
        });
      } catch (error) {
        throw new Error(
          `Failed to switch the Solana wallet to ${normalizedCluster}`,
          { cause: error },
        );
      }
    },
    [adapter],
  );

  const maybeSwitchEvmChain = useCallback(
    async (targetChainId: number): Promise<void> => {
      if (!targetChainId || targetChainId === currentChainId) return;

      const supported = adapter.supportedNetworks?.evm?.some(
        (network) => parseChainId(network.id) === targetChainId,
      );
      if (supported === false) {
        throw new Error(
          `This wallet does not support chain ${targetChainId}. Reconnect with a wallet that does.`,
        );
      }
      if (!adapter.switchChain) {
        throw new Error(
          `Cannot switch the wallet to chain ${targetChainId}. Switch networks manually and retry.`,
        );
      }
      await adapter.switchChain(targetChainId);
    },
    [adapter, currentChainId],
  );

  const signRequestPayloads = useCallback(
    async (
      req: Extract<WalletRequest, { kind: "signing" }>,
    ): Promise<string[]> => {
      const payload = req.payload;
      if (payload.chainFamily === "evm") {
        const activeOwner = adapter.identity.address;
        if (
          !activeOwner ||
          activeOwner.toLowerCase() !== payload.signer.toLowerCase()
        ) {
          throw new Error("The active EVM wallet is not the requested signer");
        }
        if (
          payload.chainId &&
          currentChainId &&
          payload.chainId !== currentChainId
        ) {
          if (!adapter.switchChain) {
            throw new Error("The active EVM chain does not match the request");
          }
          await adapter.switchChain(payload.chainId);
        }
      } else {
        const activeOwner = adapter.identity.svmAddress;
        if (!activeOwner || activeOwner !== payload.signer) {
          throw new Error("The active SVM wallet is not the requested signer");
        }
        await maybeSwitchSolanaCluster(payload.cluster);
      }

      const signatures: string[] = [];
      for (const signable of payload.payloads) {
        switch (signable.kind) {
          case "evm_personal": {
            if (payload.chainFamily !== "evm" || !adapter.signMessage) {
              throw new Error("The active wallet cannot sign an EVM message");
            }
            const result = await adapter.signMessage({
              non_typed_data: signable.message,
              description: payload.description,
              signer: payload.signer,
              chainId: payload.chainId,
            });
            signatures.push(result.signature);
            break;
          }
          case "evm_typed_data": {
            if (payload.chainFamily !== "evm" || !adapter.signTypedData) {
              throw new Error("The active wallet cannot sign EVM typed data");
            }
            const result = await adapter.signTypedData({
              typed_data: signable.typedData,
              description: payload.description,
              signer: payload.signer,
              chainId: payload.chainId,
            });
            signatures.push(result.signature);
            break;
          }
          case "svm_message": {
            if (payload.chainFamily !== "svm" || !adapter.signSolanaMessage) {
              throw new Error("The active wallet cannot sign an SVM message");
            }
            const result = await adapter.signSolanaMessage({
              message: signable.messageBase64,
              description: payload.description,
              cluster: payload.cluster,
            });
            signatures.push(result.signature);
            break;
          }
          case "svm_transaction": {
            if (
              payload.chainFamily !== "svm" ||
              !adapter.signSolanaTransaction
            ) {
              throw new Error(
                "The active wallet cannot sign an SVM transaction",
              );
            }
            const result = await adapter.signSolanaTransaction({
              unsignedTx: signable.transactionBase64,
              description: payload.description,
              cluster: payload.cluster,
            });
            // Backend-owned operations take ONLY the payer signature — the
            // backend attaches it to its stored envelope, so the client can
            // never substitute bytes. Sign-only pending requests (the venue
            // lane) return the full signed transaction: their consumer hands
            // the bytes to the venue's submit tool.
            signatures.push(
              payload.operationId
                ? extractPayerSignature(result.signedTx)
                : result.signedTx,
            );
            break;
          }
        }
      }
      return signatures;
    },
    [adapter, currentChainId, maybeSwitchSolanaCluster],
  );

  useEffect(() => {
    if (!pendingWalletRequests.length) return;
    const next = pendingWalletRequests[0];
    if (!next || processingRef.current) return;
    // Attended backend-owned operations are deliberately not automatic. The
    // dialog below is the user's authorization boundary; only its confirm
    // button invokes the wallet.
    if (next.kind === "signing" && isAttendedSigning(next.payload)) {
      return;
    }

    processingRef.current = true;
    processRequest(next).finally(() => {
      processingRef.current = false;
    });

    async function processRequest(req: WalletRequest) {
      try {
        if (req.kind === "signing") {
          if (isAttendedSigning(req.payload)) return;
          const signatures = await signRequestPayloads(req);
          await resolveWalletRequest(req.id, { kind: "signing", signatures });
          return;
        }
        if (req.kind === "transaction") {
          // `req.payload` narrows to WalletTxPayload via the discriminated union.
          const payload = hasHydratedCalls(req.payload)
            ? req.payload
            : hydrateTxPayloadFromUserState(req.payload, user, {
                strict: true,
              });

          if (!adapter.sendTransaction) {
            await rejectWalletRequest(req.id, "Wallet provider is not ready");
            return;
          }

          const defaultChainId =
            payload.chainId ??
            payload.calls?.[0]?.chainId ??
            currentChainId ??
            1;
          await maybeSwitchEvmChain(defaultChainId);
          const simulationResult = await simulateBatchTransactions(
            toSimulationTransactions(payload),
            {
              from: UserState.address(user),
              chainId: defaultChainId,
            },
          );

          // Fee injection is the production path: simulation succeeds,
          // returns a non-zero fee, and we append it to the batch so Aomi
          // gets paid atomically with the user's tx. Simulation can come
          // back without a fee for test / 0-balance / unsupported-chain
          // scenarios — in that case we still want the wallet to pop so
          // the user can sign (and have the tx revert on-chain if
          // applicable) rather than silently rejecting. `strictAa: false`
          // lets the fee-injected batch fall back from AA to sequential
          // EOA sends if the wallet/bundler fails after sign.
          const payloadWithFee = simulationResult.fee
            ? appendFeeCallToPayload(
                payload,
                simulationResult.fee,
                defaultChainId,
                { strictAa: false },
              )
            : payload;
          if (payloadWithFee === payload) {
            showNotification({
              type: "notice",
              title: "Proceeding without fee on failed simulation",
              duration: 6000,
            });
          }

          let result;
          try {
            result = await adapter.sendTransaction(payloadWithFee, {
              chainIdAlreadySelected: defaultChainId,
            });
          } catch (error) {
            // A sequential (non-atomic) executor may have landed a PREFIX
            // of the batch before failing — adapters signal that by
            // attaching `partial` to the thrown error. Reporting such a
            // failure as a blanket reject erases on-chain truth: the
            // backend re-queues every leg and a retry double-executes the
            // ones that already mined (observed: a re-run 5 ETH stake
            // against the already-debited balance). Resolve with per-leg
            // outcomes instead; anything without partial info falls
            // through to the normal reject path.
            const partial = (
              error as {
                partial?: {
                  executedTxIds?: number[];
                  lastTxHash?: string | null;
                  failedTxId?: number | null;
                  remainingTxIds?: number[];
                };
              }
            )?.partial;
            const executed = partial?.executedTxIds ?? [];
            if (executed.length > 0 && partial?.lastTxHash) {
              const failedTxIds = [
                partial.failedTxId,
                ...(partial.remainingTxIds ?? []),
              ].filter((id): id is number => typeof id === "number");
              await resolveWalletRequest(req.id, {
                kind: "transaction",
                txHash: partial.lastTxHash,
                batched: true,
                callCount: payload.calls?.length,
                completedTxIds: executed,
                failedTxIds,
                failureReason:
                  error instanceof Error
                    ? error.message
                    : "Batch aborted after a mid-sequence failure",
              });
              return;
            }
            throw error;
          }
          await resolveWalletRequest(req.id, {
            kind: "transaction",
            ...result,
          });
          return;
        }

        if (req.kind === "solana_send" || req.kind === "solana_sign_and_send") {
          if (!req.payload.unsignedTx) {
            await rejectWalletRequest(req.id, "Missing unsigned_tx payload");
            return;
          }
          await maybeSwitchSolanaCluster(req.payload.cluster);

          if (
            req.kind === "solana_sign_and_send" &&
            adapter.signAndSendSolanaTransaction
          ) {
            const result = await adapter.signAndSendSolanaTransaction(
              req.payload,
            );
            await resolveWalletRequest(req.id, {
              kind: "solana_sign_and_send",
              ...result,
            });
            return;
          }

          if (adapter.sendSolanaTransaction) {
            const result = await adapter.sendSolanaTransaction(req.payload);
            await resolveWalletRequest(req.id, {
              kind: req.kind,
              ...result,
            });
            return;
          }

          if (!adapter.signSolanaTransaction) {
            await rejectWalletRequest(
              req.id,
              "Solana wallet provider is not ready",
            );
            return;
          }

          if (!adapter.solanaRpcHttpUrl) {
            await rejectWalletRequest(
              req.id,
              "Solana RPC is not configured for broadcast",
            );
            return;
          }

          const signResult = await adapter.signSolanaTransaction(req.payload);
          const connection = new SolanaConnection(
            adapter.solanaRpcHttpUrl,
            "confirmed",
          );
          const signature = await connection.sendRawTransaction(
            decodeBase64(signResult.signedTx),
          );
          await connection.confirmTransaction(signature, "confirmed");

          await resolveWalletRequest(req.id, {
            kind: req.kind,
            signature,
            signedTx: signResult.signedTx,
          });
          return;
        }
      } catch (error) {
        console.error("[RuntimeTxHandler] Request failed:", error);
        await rejectWalletRequest(
          req.id,
          error instanceof Error ? error.message : "Request failed",
        );
      }
    }
  }, [
    adapter,
    user,
    pendingWalletRequests,
    currentChainId,
    resolveWalletRequest,
    rejectWalletRequest,
    simulateBatchTransactions,
    showNotification,
    maybeSwitchEvmChain,
    maybeSwitchSolanaCluster,
    signRequestPayloads,
  ]);

  const rejectAa = async () => {
    if (!aaRequest || isSigningAa) return;
    setIsSigningAa(true);
    try {
      await rejectWalletRequest(aaRequest.id, "Request rejected");
    } catch (error) {
      showNotification({
        type: "error",
        title: error instanceof Error ? error.message : "AA rejection failed",
        duration: 6000,
      });
    } finally {
      setIsSigningAa(false);
    }
  };

  const approveAa = async () => {
    if (!aaRequest || isSigningAa) return;
    setIsSigningAa(true);
    try {
      const signatures = await signRequestPayloads(aaRequest);
      await resolveWalletRequest(aaRequest.id, {
        kind: "signing",
        signatures,
      });
      showNotification({
        type: "notice",
        title: "Signature accepted; Aomi is broadcasting",
        duration: 4000,
      });
    } catch (error) {
      showNotification({
        type: "error",
        title: error instanceof Error ? error.message : "AA signing failed",
        duration: 6000,
      });
    } finally {
      setIsSigningAa(false);
    }
  };

  if (aaRequest) {
    const isSvm = aaRequest.payload.chainFamily === "svm";
    const chainName = isSvm
      ? (normalizeSolanaCluster(aaRequest.payload.cluster) ??
        aaRequest.payload.cluster ??
        "Solana")
      : (adapter.supportedChains?.find(
          (chain) => chain.id === aaRequest.payload.chainId,
        )?.name ?? `Chain ${aaRequest.payload.chainId}`);
    const signatureCount = aaRequest.payload.payloads.length;
    const calls = aaRequest.payload.calls ?? [];
    const fees = aaRequest.payload.fees ?? [];
    return (
      <Dialog open onOpenChange={(open) => !open && void rejectAa()}>
        <DialogContent
          showCloseButton={false}
          className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
        >
          <DialogHeader>
            <div className="bg-primary/10 text-primary mb-1 flex size-10 items-center justify-center rounded-full">
              <ShieldCheck className="size-5" />
            </div>
            <DialogTitle>Approve account action</DialogTitle>
            <DialogDescription>
              {isSvm
                ? "Review the sealed transaction and mandatory Aomi fees. Your wallet signs the exact bytes; Aomi submits and watches the transaction from the backend."
                : "Review the exact application calls and mandatory Aomi fees. Your wallet signs; Aomi sponsors and broadcasts the ERC-4337 operation from the backend."}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/40 grid gap-3 rounded-xl border p-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Network</span>
              <span className="font-medium">{chainName}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Account</span>
              <span className="font-mono text-xs">
                {aaRequest.payload.signer.slice(0, 8)}…
                {aaRequest.payload.signer.slice(-6)}
              </span>
            </div>
            {aaRequest.payload.executor ? (
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Executor</span>
                <span className="font-mono text-xs">
                  {aaRequest.payload.executor.slice(0, 8)}…
                  {aaRequest.payload.executor.slice(-6)}
                </span>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Operations</span>
              <span className="font-medium">{calls.length || 1}</span>
            </div>
            {aaRequest.payload.sponsorship ? (
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Sponsorship</span>
                <span className="font-medium">Required · backend only</span>
              </div>
            ) : null}
            {aaRequest.payload.expiresAt ? (
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Signature expires</span>
                <span className="font-mono text-xs">
                  {aaRequest.payload.expiresAt}
                </span>
              </div>
            ) : null}
            {aaRequest.payload.callsDigest ? (
              <div className="border-t pt-3">
                <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
                  Final call digest
                </p>
                <p className="break-all font-mono text-xs">
                  {aaRequest.payload.callsDigest}
                </p>
              </div>
            ) : null}
            {calls.length ? (
              <div className="border-t pt-3">
                <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
                  Application calls
                </p>
                <div className="grid gap-2">
                  {calls.map((call, index) => (
                    <div
                      key={`${call.to}-${index}`}
                      className="bg-background rounded-lg border p-3 text-xs"
                    >
                      <p className="mb-1 font-medium">Call {index + 1}</p>
                      <p className="break-all font-mono">To: {call.to}</p>
                      <p className="break-all font-mono">Value: {call.value}</p>
                      <p className="break-all font-mono">
                        Data: {call.data ?? "0x"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="border-t pt-3">
              <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
                Mandatory Aomi fees
              </p>
              {fees.map((fee, index) => (
                <div
                  key={`${fee.recipient}-${index}`}
                  className="bg-background mb-2 rounded-lg border p-3 text-xs last:mb-0"
                >
                  <p className="break-all font-mono">
                    Asset: {aaFeeAssetLabel(fee.asset)}
                  </p>
                  <p className="break-all font-mono">Amount: {fee.amount}</p>
                  <p className="break-all font-mono">
                    Recipient: {fee.recipient}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Wallet approvals</span>
              <span className="font-medium">{signatureCount}</span>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => void rejectAa()}
              disabled={isSigningAa}
            >
              Cancel
            </Button>
            <Button onClick={() => void approveAa()} disabled={isSigningAa}>
              {isSigningAa
                ? "Waiting for wallet…"
                : `Review & sign${signatureCount > 1 ? ` (${signatureCount})` : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}
