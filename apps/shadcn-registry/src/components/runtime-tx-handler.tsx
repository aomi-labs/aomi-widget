"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import {
  Connection as SolanaConnection,
  Transaction as SolanaLegacyTransaction,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  normalizeSolanaCluster,
  type Action,
  type ActionResult,
  type ActionRequest,
  type WalletSolanaSignPayload,
  type WalletTxPayload,
} from "@aomi-labs/client";
import {
  UserState,
  appendFeeCallToPayload,
  parseChainId,
  useAomiRuntime,
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

type SigningAction = Action & {
  request: Extract<ActionRequest, { type: "sign" }>;
};

function isAttended(action: Action): action is SigningAction {
  if (action.request.type !== "sign") return false;
  if (action.request.executionKind === "erc4337") return true;
  return (
    action.request.chainFamily === "svm" &&
    action.request.executionKind === "transaction" &&
    action.request.broadcaster === "hosted" &&
    Boolean(action.request.operationId)
  );
}

function decodeBase64(value: string): Uint8Array {
  if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(value, "base64"));
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function encodeBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  return btoa(String.fromCharCode(...bytes));
}

function extractPayerSignature(signedTransaction: string): string {
  const bytes = decodeBase64(signedTransaction);
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

function feeAssetLabel(asset: unknown): string {
  if (typeof asset !== "object" || asset === null) return "Unknown asset";
  const value = asset as { kind?: unknown; address?: unknown };
  if (value.kind === "native") return "Native";
  return value.kind === "token" && typeof value.address === "string"
    ? value.address
    : "Unknown asset";
}

/** Executes the request nested in the first pending canonical Action. */
export function RuntimeTxHandler() {
  const {
    user,
    pendingActions,
    respondToAction,
    rejectAction,
    simulateBatchTransactions,
    showNotification,
  } = useAomiRuntime();
  const adapter = useAomiWalletKit();
  const currentChainId = adapter.identity.chainId;
  const processing = useRef(false);
  const [approving, setApproving] = useState(false);
  const attendedAction = pendingActions[0] && isAttended(pendingActions[0])
    ? pendingActions[0]
    : null;

  const switchSvm = useCallback(
    async (cluster?: string) => {
      const normalized = normalizeSolanaCluster(cluster);
      if (!normalized) return;
      const target = adapter.supportedNetworks?.solana?.find(
        (network) => network.cluster === normalized,
      );
      if (!target) throw new Error(`Unsupported Solana cluster: ${normalized}`);
      if (adapter.selectedSolanaNetwork?.id === target.id) return;
      if (!adapter.selectNetwork || adapter.solanaNetworkSwitchRequiresReconnect) {
        throw new Error(`Reconnect the Solana wallet on ${normalized} before signing`);
      }
      await adapter.selectNetwork({ family: "solana", networkId: target.id });
    },
    [adapter],
  );

  const switchEvm = useCallback(
    async (chainId: number) => {
      if (chainId === currentChainId) return;
      const supported = adapter.supportedNetworks?.evm?.some(
        (network) => parseChainId(network.id) === chainId,
      );
      if (supported === false || !adapter.switchChain) {
        throw new Error(`The active wallet cannot switch to chain ${chainId}`);
      }
      await adapter.switchChain(chainId);
    },
    [adapter, currentChainId],
  );

  const sign = useCallback(
    async (action: SigningAction): Promise<ActionResult> => {
      const request = action.request;
      if (request.chainFamily === "evm") {
        const owner = adapter.identity.address;
        if (!owner || owner.toLowerCase() !== request.signer.toLowerCase()) {
          throw new Error("The active EVM wallet is not the requested signer");
        }
        if (request.chainId) await switchEvm(request.chainId);
      } else {
        if (adapter.identity.svmAddress !== request.signer) {
          throw new Error("The active SVM wallet is not the requested signer");
        }
        await switchSvm(request.cluster);
      }

      const outputs: Extract<ActionResult, { status: "signed" }>["outputs"] = [];
      for (const [index, payload] of request.payloads.entries()) {
        const id = `payload_${index + 1}`;
        if (payload.kind === "evm_personal") {
          if (!adapter.signMessage) throw new Error("The wallet cannot sign EVM messages");
          const result = await adapter.signMessage({
            non_typed_data: payload.message,
            description: request.description,
            signer: request.signer,
            chainId: request.chainId,
          });
          outputs.push({ id, signature: result.signature });
        } else if (payload.kind === "evm_typed_data") {
          if (!adapter.signTypedData) throw new Error("The wallet cannot sign typed data");
          const result = await adapter.signTypedData({
            typed_data: payload.typed_data,
            description: request.description,
            signer: request.signer,
            chainId: request.chainId,
          });
          outputs.push({ id, signature: result.signature });
        } else if (payload.kind === "svm_message") {
          if (!adapter.signSolanaMessage) throw new Error("The wallet cannot sign SVM messages");
          const result = await adapter.signSolanaMessage({
            message: payload.message_base64,
            description: request.description,
            cluster: request.cluster,
          });
          outputs.push({ id, signature: result.signature });
        } else {
          if (!adapter.signSolanaTransaction) {
            throw new Error("The wallet cannot sign SVM transactions");
          }
          const result = await adapter.signSolanaTransaction({
            unsignedTx: payload.transaction_base64,
            description: request.description,
            cluster: request.cluster,
          });
          outputs.push(
            request.operationId
              ? { id, signature: extractPayerSignature(result.signedTx) }
              : { id, signedTransactionBase64: result.signedTx },
          );
        }
      }
      return { status: "signed", outputs };
    },
    [adapter, switchEvm, switchSvm],
  );

  const executeEvm = useCallback(
    async (
      request: Extract<ActionRequest, { type: "execute_evm" }>,
    ): Promise<ActionResult> => {
      if (!adapter.sendTransaction) throw new Error("Wallet provider is not ready");
      const first = request.transactions[0];
      if (!first) throw new Error("EVM Action contains no transactions");
      await switchEvm(first.chain_id);
      const payload: WalletTxPayload = {
        requestId: "action",
        chainId: first.chain_id,
        calls: request.transactions.map((transaction, index) => ({
          txId: index + 1,
          to: transaction.to,
          value: transaction.value,
          data: transaction.data,
          chainId: transaction.chain_id,
          from: transaction.from,
          gas: transaction.gas,
          description: transaction.label,
        })),
        txIds: request.transactions.map((_, index) => index + 1),
      };
      const simulation = await simulateBatchTransactions(
        request.transactions.map((transaction) => ({
          to: transaction.to,
          value: transaction.value,
          data: transaction.data,
          label: transaction.label,
          chain_id: transaction.chain_id,
        })),
        { from: UserState.address(user), chainId: first.chain_id },
      );
      const executable = simulation.fee
        ? appendFeeCallToPayload(payload, simulation.fee, first.chain_id, {
            strictAa: false,
          })
        : payload;
      if (!simulation.fee) {
        showNotification({
          type: "notice",
          title: "Proceeding without fee on failed simulation",
          duration: 6000,
        });
      }
      const result = await adapter.sendTransaction(executable, {
        chainIdAlreadySelected: first.chain_id,
      });
      const batchHashes = (result as typeof result & { txHashes?: string[] }).txHashes;
      const hashes = batchHashes?.length ? batchHashes : [result.txHash];
      return {
        status: "submitted",
        legs: request.transactions.map((_, index) => ({
          id: `leg_${index + 1}`,
          status: "submitted",
          transactionId: hashes[index] ?? hashes.at(-1)!,
        })),
      };
    },
    [adapter, showNotification, simulateBatchTransactions, switchEvm, user],
  );

  const executeSvm = useCallback(
    async (
      request: Extract<ActionRequest, { type: "execute_svm" }>,
    ): Promise<ActionResult> => {
      const first = request.transactions[0];
      if (!first) throw new Error("SVM Action contains no transactions");
      await switchSvm(first.cluster);
      const legs: Extract<ActionResult, { status: "submitted" }>["legs"] = [];
      for (const [index, transaction] of request.transactions.entries()) {
        const unsignedTx = transaction.unsigned_transaction_base64;
        if (!unsignedTx) throw new Error("SVM Action has no unsigned transaction bytes");
        const payload: WalletSolanaSignPayload = {
          requestId: `leg_${index + 1}`,
          unsignedTx,
          cluster: transaction.cluster,
          description: transaction.description,
        };
        try {
          let result: { signature: string; signedTx?: string };
          if (adapter.signAndSendSolanaTransaction) {
            result = await adapter.signAndSendSolanaTransaction(payload);
          } else if (adapter.sendSolanaTransaction) {
            result = await adapter.sendSolanaTransaction(payload);
          } else if (adapter.signSolanaTransaction && adapter.solanaRpcHttpUrl) {
            const signed = await adapter.signSolanaTransaction(payload);
            const connection = new SolanaConnection(adapter.solanaRpcHttpUrl, "confirmed");
            const signature = await connection.sendRawTransaction(decodeBase64(signed.signedTx));
            await connection.confirmTransaction(signature, "confirmed");
            result = { signature, signedTx: signed.signedTx };
          } else {
            throw new Error("Solana wallet provider is not ready");
          }
          legs.push({
            id: `leg_${index + 1}`,
            status: "submitted",
            transactionId: result.signature,
            signedTransactionBase64: result.signedTx,
          });
        } catch (error) {
          legs.push({
            id: `leg_${index + 1}`,
            status: "failed",
            reason: error instanceof Error ? error.message : "Request failed",
          });
          for (let skipped = index + 1; skipped < request.transactions.length; skipped += 1) {
            legs.push({
              id: `leg_${skipped + 1}`,
              status: "skipped",
              reason: "Skipped after an earlier transaction failed",
            });
          }
          break;
        }
      }
      if (!legs.some((leg) => leg.status === "submitted")) {
        throw new Error(legs[0]?.reason ?? "SVM Action failed");
      }
      return { status: "submitted", legs };
    },
    [adapter, switchSvm],
  );

  useEffect(() => {
    const action = pendingActions[0];
    if (!action || processing.current || isAttended(action)) return;
    processing.current = true;
    const execute =
      action.request.type === "sign"
        ? sign(action as SigningAction)
        : action.request.type === "execute_evm"
          ? executeEvm(action.request)
          : executeSvm(action.request);
    void execute
      .then((result) => respondToAction(action.id, result))
      .catch((error: unknown) => {
        console.error("[RuntimeTxHandler] Action failed:", error);
        return rejectAction(
          action.id,
          error instanceof Error ? error.message : "Action failed",
        );
      })
      .finally(() => {
        processing.current = false;
      });
  }, [executeEvm, executeSvm, pendingActions, rejectAction, respondToAction, sign]);

  const decide = async (approved: boolean) => {
    if (!attendedAction || approving) return;
    setApproving(true);
    try {
      if (approved) {
        await respondToAction(attendedAction.id, await sign(attendedAction));
      } else {
        await rejectAction(attendedAction.id, "Request rejected");
      }
    } catch (error) {
      showNotification({
        type: "error",
        title: error instanceof Error ? error.message : "Action response failed",
        duration: 6000,
      });
    } finally {
      setApproving(false);
    }
  };

  if (!attendedAction) return null;
  const request = attendedAction.request;
  const isSvm = request.chainFamily === "svm";
  const chainName = isSvm
    ? normalizeSolanaCluster(request.cluster) ?? request.cluster ?? "Solana"
    : adapter.supportedChains?.find((chain) => chain.id === request.chainId)?.name ??
      `Chain ${request.chainId}`;
  const calls = (request.calls ?? []) as Array<{
    to?: string;
    value?: string;
    data?: string;
  }>;
  const fees = (request.fees ?? []) as Array<{
    asset?: unknown;
    amount?: string;
    recipient?: string;
  }>;

  return (
    <Dialog open onOpenChange={(open) => !open && void decide(false)}>
      <DialogContent showCloseButton={false} className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="bg-primary/10 text-primary mb-1 flex size-10 items-center justify-center rounded-full">
            <ShieldCheck className="size-5" />
          </div>
          <DialogTitle>Approve account action</DialogTitle>
          <DialogDescription>
            Review the exact operation. Your wallet signs; Aomi broadcasts from the backend.
          </DialogDescription>
        </DialogHeader>
        <div className="bg-muted/40 grid gap-3 rounded-xl border p-4 text-sm">
          <Fact label="Network" value={chainName} />
          <Fact label="Account" value={`${request.signer.slice(0, 8)}…${request.signer.slice(-6)}`} mono />
          <Fact label="Operations" value={String(calls.length || 1)} />
          {calls.map((call, index) => (
            <div key={index} className="bg-background rounded-lg border p-3 text-xs">
              <p className="mb-1 font-medium">Call {index + 1}</p>
              <p className="break-all font-mono">To: {call.to}</p>
              <p className="break-all font-mono">Value: {call.value}</p>
              <p className="break-all font-mono">Data: {call.data ?? "0x"}</p>
            </div>
          ))}
          {fees.map((fee, index) => (
            <div key={index} className="bg-background rounded-lg border p-3 text-xs">
              <p className="break-all font-mono">Asset: {feeAssetLabel(fee.asset)}</p>
              <p className="break-all font-mono">Amount: {fee.amount}</p>
              <p className="break-all font-mono">Recipient: {fee.recipient}</p>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => void decide(false)} disabled={approving}>
            Cancel
          </Button>
          <Button onClick={() => void decide(true)} disabled={approving}>
            {approving ? "Waiting for wallet…" : "Review & sign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Fact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-xs" : "font-medium"}>{value}</span>
    </div>
  );
}
