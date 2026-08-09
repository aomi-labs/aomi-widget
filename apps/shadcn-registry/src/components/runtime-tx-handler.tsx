"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Connection as SolanaConnection } from "@solana/web3.js";
import { normalizeSolanaCluster } from "@aomi-labs/client";
import {
  UserState,
  appendFeeCallToPayload,
  hydrateTxPayloadFromUserState,
  parseChainId,
  toViemSignMessageArgs,
  toViemSignTypedDataArgs,
  useAomiRuntime,
  type WalletRequest,
  type WalletTxPayload,
} from "@aomi-labs/react";
import { useAomiWalletKit } from "../lib/wallet-kit";
import { useBackendAa } from "../lib/wallet-kit/execution/backend-aa-context";
import { walletDebug } from "../lib/wallet-kit/wallet-debug";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

// Mirrors the backend `AaOperationState` enum (serde snake_case). Keep in sync.
type AaOperationState =
  | "preparing"
  | "awaiting_signature"
  | "submitting"
  | "submitted"
  | "confirmed"
  | "rejected"
  | "failed"
  | "expired";

type AaOperationView = {
  operationId: string;
  state: AaOperationState;
  txHashes: `0x${string}`[];
  failureCode?: string;
};

function hasHydratedCalls(payload: WalletTxPayload): boolean {
  return Array.isArray(payload.calls) && payload.calls.length > 0;
}

function decodeBase64(value: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64"));
  }
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
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
 * Invisible bridge component that processes wallet transaction and EIP-712
 * signing requests from the AI backend through the active Aomi wallet kit.
 *
 * Auto-mounted inside AomiFrame.Root.
 */
export function RuntimeTxHandler() {
  const {
    user,
    currentThreadId,
    pendingWalletRequests,
    dismissWalletRequest,
    resolveWalletRequest,
    rejectWalletRequest,
    simulateBatchTransactions,
    showNotification,
  } = useAomiRuntime();
  const adapter = useAomiWalletKit();
  const backendAa = useBackendAa();
  const { chainId: currentChainId } = adapter.identity;
  const processingRef = useRef(false);
  const [isSigningAa, setIsSigningAa] = useState(false);
  const aaRequest =
    pendingWalletRequests[0]?.kind === "aa_sign"
      ? pendingWalletRequests[0]
      : null;

  const requestAaOperation = useCallback(
    async (
      path: string,
      init?: { method?: "GET" | "POST"; body?: unknown },
    ): Promise<AaOperationView> => {
      const bearer = await backendAa.getAccountBearer?.();
      if (!bearer) throw new Error("Widget session is not ready");
      const response = await fetch(
        `${backendAa.apiUrl}/api/widget/v1/aa-operations/${path}`,
        {
          method: init?.method ?? "GET",
          credentials: "omit",
          headers: {
            authorization: `Bearer ${bearer}`,
            ...(init?.body === undefined
              ? {}
              : { "content-type": "application/json" }),
            "x-thread-id": currentThreadId,
          },
          body:
            init?.body === undefined ? undefined : JSON.stringify(init.body),
        },
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
          error_code?: string;
        } | null;
        throw new Error(
          payload?.error ??
            payload?.error_code ??
            "AA operation request failed",
        );
      }
      return (await response.json()) as AaOperationView;
    },
    [backendAa.apiUrl, backendAa.getAccountBearer, currentThreadId],
  );

  const getAaOperation = useCallback(
    (operationId: string) => requestAaOperation(operationId),
    [requestAaOperation],
  );

  const postAaOperation = useCallback(
    (path: string, body: unknown) =>
      requestAaOperation(path, { method: "POST", body }),
    [requestAaOperation],
  );

  // Surface a terminal operation state to the user. Returns true when the
  // state was terminal (and a notification fired), so callers know to stop
  // polling — and so a terminal state returned synchronously from the
  // signatures POST is not silently swallowed behind the "submitted" notice.
  const notifyAaTerminalState = useCallback(
    (operation: AaOperationView): boolean => {
      if (operation.state === "confirmed") {
        showNotification({
          type: "success",
          title: "Sponsored operation confirmed",
          duration: 6000,
        });
        return true;
      }
      if (
        operation.state === "failed" ||
        operation.state === "rejected" ||
        operation.state === "expired"
      ) {
        showNotification({
          type: "error",
          title: operation.failureCode ?? `AA operation ${operation.state}`,
          duration: 6000,
        });
        return true;
      }
      return false;
    },
    [showNotification],
  );

  const watchAaOperation = useCallback(
    async (operationId: string) => {
      for (let attempt = 0; attempt < 45; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2_000));
        const operation = await getAaOperation(operationId);
        if (notifyAaTerminalState(operation)) return;
      }
    },
    [getAaOperation, notifyAaTerminalState],
  );

  useEffect(() => {
    if (!pendingWalletRequests.length) return;
    const next = pendingWalletRequests[0];
    if (!next || processingRef.current) return;
    // Attended AA is deliberately not automatic. The dialog below is the
    // user's authorization boundary; only its confirm button invokes Privy.
    if (next.kind === "aa_sign") return;

    processingRef.current = true;
    processRequest(next).finally(() => {
      processingRef.current = false;
    });

    /** Canonicalize cluster aliases and match before asking the wallet. */
    async function maybeSwitchSolanaCluster(
      requestedCluster: string | undefined,
    ): Promise<void> {
      const normalizedCluster = normalizeSolanaCluster(requestedCluster);
      if (!normalizedCluster) return;
      const target = adapter.supportedNetworks?.solana?.find(
        (n) => n.cluster === normalizedCluster,
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
    }

    async function processRequest(req: WalletRequest) {
      try {
        if (req.kind === "aa_sign") return;
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
            result = await adapter.sendTransaction(payloadWithFee);
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

        if (req.kind === "solana_sign") {
          // No simulation or fee injection — host doesn't have a Solana
          // fork simulator and apps own RPC routing. We DO auto-switch the
          // active Solana cluster to match the request's cluster (mirroring
          // what the EVM eip712_sign branch does for `domain.chainId`):
          // otherwise a request targeted at mainnet while the wallet is on
          // devnet silently produces a tx for the wrong network.
          if (!adapter.signSolanaTransaction) {
            await rejectWalletRequest(
              req.id,
              "Solana wallet provider is not ready",
            );
            return;
          }
          if (!req.payload.unsignedTx) {
            await rejectWalletRequest(req.id, "Missing unsigned_tx payload");
            return;
          }
          await maybeSwitchSolanaCluster(req.payload.cluster);

          const result = await adapter.signSolanaTransaction(req.payload);
          await resolveWalletRequest(req.id, {
            kind: "solana_sign",
            ...result,
          });
          return;
        }

        if (req.kind === "solana_sign_message") {
          if (!adapter.signSolanaMessage) {
            await rejectWalletRequest(
              req.id,
              "Solana wallet provider is not ready",
            );
            return;
          }
          if (!req.payload.message) {
            await rejectWalletRequest(req.id, "Missing message payload");
            return;
          }

          walletDebug("runtime-tx:solana-sign-message:invoke", {
            requestId: req.id,
            pendingSolanaId: req.payload.pendingSolanaId,
            cluster: req.payload.cluster,
            description: req.payload.description,
            adapterReady: adapter.isReady,
            svmAddress: adapter.identity.svmAddress,
            svmWalletName: adapter.identity.svmWalletName,
            hasSignSolanaMessage: Boolean(adapter.signSolanaMessage),
          });
          const result = await adapter.signSolanaMessage(req.payload);
          walletDebug("runtime-tx:solana-sign-message:resolved", {
            requestId: req.id,
            pendingSolanaId: req.payload.pendingSolanaId,
            signatureLength: result.signature?.length,
          });
          await resolveWalletRequest(req.id, {
            kind: "solana_sign_message",
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

        // req.kind === "eip712_sign"
        const signArgs = toViemSignTypedDataArgs(req.payload);
        const messageArgs = toViemSignMessageArgs(req.payload);
        if (signArgs && messageArgs) {
          await rejectWalletRequest(
            req.id,
            "Signature request cannot include both typed_data and non_typed_data",
          );
          return;
        }
        if (!signArgs && !messageArgs) {
          await rejectWalletRequest(
            req.id,
            "Missing typed_data or non_typed_data payload",
          );
          return;
        }

        if (signArgs && !adapter.signTypedData) {
          await rejectWalletRequest(req.id, "Wallet provider is not ready");
          return;
        }
        if (messageArgs && !adapter.signMessage) {
          await rejectWalletRequest(req.id, "Wallet provider is not ready");
          return;
        }

        const domainChainId = signArgs?.domain?.chainId;
        const requestChainId =
          typeof domainChainId === "number" || typeof domainChainId === "string"
            ? parseChainId(domainChainId)
            : undefined;
        if (
          requestChainId &&
          currentChainId &&
          requestChainId !== currentChainId &&
          adapter.switchChain
        ) {
          await adapter.switchChain(requestChainId);
        }

        const result = signArgs
          ? await adapter.signTypedData!({
              ...req.payload,
              typed_data: signArgs,
            })
          : await adapter.signMessage!(req.payload);
        await resolveWalletRequest(req.id, { kind: "eip712_sign", ...result });
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
  ]);

  useEffect(() => {
    if (!aaRequest) return;
    let cancelled = false;
    void getAaOperation(aaRequest.payload.operationId)
      .then((operation) => {
        if (!cancelled && operation.state !== "awaiting_signature") {
          dismissWalletRequest(aaRequest.id);
        }
      })
      .catch(() => {
        // The operation event can arrive before the first read is visible.
        // Approval still revalidates all state through the signature endpoint.
      });
    return () => {
      cancelled = true;
    };
  }, [aaRequest, dismissWalletRequest, getAaOperation]);

  const rejectAa = async () => {
    if (!aaRequest || isSigningAa) return;
    setIsSigningAa(true);
    try {
      await postAaOperation(`${aaRequest.payload.operationId}/reject`, {});
    } catch (error) {
      showNotification({
        type: "error",
        title: error instanceof Error ? error.message : "AA rejection failed",
        duration: 6000,
      });
    } finally {
      // Dismiss even when the reject POST fails: the operation expires
      // server-side, and leaving the request pending would trap the user in a
      // modal that cannot be closed.
      dismissWalletRequest(aaRequest.id);
      setIsSigningAa(false);
    }
  };

  const approveAa = async () => {
    if (!aaRequest || isSigningAa) return;
    if (!adapter.signAaRequests) {
      showNotification({
        type: "error",
        title: "This wallet cannot sign account-abstraction requests",
        duration: 6000,
      });
      // Reject through the operation endpoint — the generic reject path throws
      // for aa_sign requests.
      await rejectAa();
      return;
    }
    setIsSigningAa(true);
    try {
      const result = await adapter.signAaRequests(aaRequest.payload);
      const operation = await postAaOperation(
        `${aaRequest.payload.operationId}/signatures`,
        { signatures: result.signatures },
      );
      dismissWalletRequest(aaRequest.id);
      // A fast backend may return a terminal state directly; surface it instead
      // of the transient "submitted" notice, and only poll while still pending.
      if (!notifyAaTerminalState(operation)) {
        showNotification({
          type: "notice",
          title: "Sponsored operation submitted",
          duration: 4000,
        });
        void watchAaOperation(operation.operationId).catch((error) => {
          console.warn("[RuntimeTxHandler] AA status polling failed", error);
        });
      }
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
    const chainName =
      adapter.supportedChains?.find(
        (chain) => chain.id === aaRequest.payload.chainId,
      )?.name ?? `Chain ${aaRequest.payload.chainId}`;
    const signatureCount = aaRequest.payload.signatureRequests.length;
    return (
      <Dialog open onOpenChange={(open) => !open && void rejectAa()}>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <div className="bg-primary/10 text-primary mb-1 flex size-10 items-center justify-center rounded-full">
              <ShieldCheck className="size-5" />
            </div>
            <DialogTitle>Approve account action</DialogTitle>
            <DialogDescription>
              Review the exact application calls and mandatory Aomi fees. Your
              wallet signs; Aomi sponsors and broadcasts the ERC-4337 operation
              from the backend.
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
                {aaRequest.payload.owner.slice(0, 8)}…
                {aaRequest.payload.owner.slice(-6)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Executor</span>
              <span className="font-mono text-xs">
                {aaRequest.payload.executor.slice(0, 8)}…
                {aaRequest.payload.executor.slice(-6)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Operations</span>
              <span className="font-medium">
                {aaRequest.payload.calls.length}
              </span>
            </div>
            <div className="border-t pt-3">
              <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
                Aomi fees
              </p>
              {aaRequest.payload.fees.map((fee, index) => (
                <div
                  key={`${fee.recipient}-${index}`}
                  className="flex items-center justify-between gap-4 text-xs"
                >
                  <span className="font-mono">{String(fee.amount)}</span>
                  <span className="text-muted-foreground font-mono">
                    {fee.recipient.slice(0, 8)}…{fee.recipient.slice(-6)}
                  </span>
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
