"use client";

import { useEffect, useRef, useState } from "react";
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
    pendingWalletRequests,
    startWalletRequest,
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
    pendingWalletRequests[0]?.kind === "aa_sign"
      ? pendingWalletRequests[0]
      : null;

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

    async function maybeSwitchEvmChain(targetChainId: number): Promise<void> {
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
    }

    async function processRequest(req: WalletRequest) {
      try {
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

  const approveAa = async () => {
    if (!aaRequest || isSigningAa) return;
    if (!adapter.signAaRequests) {
      await rejectWalletRequest(
        aaRequest.id,
        "This wallet cannot sign account-abstraction requests",
      );
      return;
    }
    setIsSigningAa(true);
    startWalletRequest(aaRequest.id);
    try {
      const result = await adapter.signAaRequests(aaRequest.payload);
      await resolveWalletRequest(aaRequest.id, {
        kind: "aa_sign",
        signatures: result.signatures,
      });
    } catch (error) {
      await rejectWalletRequest(
        aaRequest.id,
        error instanceof Error ? error.message : "AA signing failed",
      );
    } finally {
      setIsSigningAa(false);
    }
  };

  const rejectAa = async () => {
    if (!aaRequest || isSigningAa) return;
    await rejectWalletRequest(aaRequest.id, "User rejected AA signing");
  };

  if (aaRequest) {
    const chainName =
      adapter.supportedChains?.find(
        (chain) => chain.id === aaRequest.payload.chain_id,
      )?.name ?? `Chain ${aaRequest.payload.chain_id}`;
    const signatureCount = aaRequest.payload.signature_requests.length;
    // EIP-7702's protocol-level code authorization is not the Privy provider
    // delegation that enables Auto. This remains a user-clicked Manual
    // transaction approval and never creates an Aomi signing grant.
    const includes7702Authorization = aaRequest.payload.signature_requests.some(
      (request) => request.kind === "eip7702_authorization",
    );
    return (
      <Dialog open onOpenChange={(open) => !open && void rejectAa()}>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <div className="bg-primary/10 text-primary mb-1 flex size-10 items-center justify-center rounded-full">
              <ShieldCheck className="size-5" />
            </div>
            <DialogTitle>Approve account action</DialogTitle>
            <DialogDescription>
              Review this sponsored {aaRequest.payload.aa_mode} action before
              your wallet signs it. Aomi cannot sign on your behalf in Manual
              mode.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/40 grid gap-3 rounded-xl border p-4 text-sm">
            {aaRequest.payload.description ? (
              <div className="flex items-start justify-between gap-4">
                <span className="text-muted-foreground">Action</span>
                <span className="text-right font-medium">
                  {aaRequest.payload.description}
                </span>
              </div>
            ) : null}
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
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Operations</span>
              <span className="font-medium">
                {aaRequest.payload.tx_ids.length}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Wallet approvals</span>
              <span className="font-medium">{signatureCount}</span>
            </div>
            {includes7702Authorization ? (
              <p className="text-muted-foreground border-t pt-3 text-xs leading-relaxed">
                The first approval installs the 7702 smart-account code for this
                network. The second approves this action. Future actions
                normally need one approval.
              </p>
            ) : null}
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
