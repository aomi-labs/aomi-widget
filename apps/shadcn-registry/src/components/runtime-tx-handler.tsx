"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import type { Action, ActionRequest } from "@aomi-labs/client";
import { normalizeSolanaCluster } from "@aomi-labs/client";
import { useAomiRuntime } from "@aomi-labs/react";

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

type Call = { to?: string; value?: string; data?: string };
type Fee = { asset?: unknown; amount?: string; recipient?: string };

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

/** Runs unattended Actions and presents the Actions that require explicit review. */
export function RuntimeTxHandler() {
  const { pendingActions, executeAction, rejectAction, showNotification } =
    useAomiRuntime();
  const wallet = useAomiWalletKit();
  const attempted = useRef(new Set<string>());
  const [approving, setApproving] = useState(false);
  const action = pendingActions[0];
  const attendedAction = action && isAttended(action) ? action : null;

  useEffect(() => {
    if (!action || attendedAction || attempted.current.has(action.id)) return;
    attempted.current.add(action.id);
    void executeAction(action.id).catch((error: unknown) => {
      console.error("[RuntimeTxHandler] Action failed:", error);
      showNotification({
        type: "error",
        title: error instanceof Error ? error.message : "Action failed",
        duration: 6000,
      });
    });
  }, [action, attendedAction, executeAction, showNotification]);

  const decide = async (approved: boolean) => {
    if (!attendedAction || approving) return;
    setApproving(true);
    try {
      if (approved) await executeAction(attendedAction.id);
      else await rejectAction(attendedAction.id, "Request rejected");
    } catch (error) {
      showNotification({
        type: "error",
        title:
          error instanceof Error ? error.message : "Action response failed",
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
    ? (normalizeSolanaCluster(request.cluster) ?? request.cluster ?? "Solana")
    : (wallet.supportedChains?.find((chain) => chain.id === request.chainId)
        ?.name ?? `Chain ${request.chainId}`);
  const calls = (request.calls ?? []).filter(isCall);
  const fees = (request.fees ?? []).filter(isFee);

  return (
    <Dialog open onOpenChange={(open) => !open && void decide(false)}>
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
            Review the exact operation. Your wallet signs; Aomi broadcasts from
            the backend.
          </DialogDescription>
        </DialogHeader>
        <div className="bg-muted/40 grid gap-3 rounded-xl border p-4 text-sm">
          <Fact label="Network" value={chainName} />
          <Fact
            label="Account"
            value={`${request.signer.slice(0, 8)}…${request.signer.slice(-6)}`}
            mono
          />
          <Fact label="Operations" value={String(calls.length || 1)} />
          {calls.map((call, index) => (
            <div
              key={index}
              className="bg-background rounded-lg border p-3 text-xs"
            >
              <p className="mb-1 font-medium">Call {index + 1}</p>
              <p className="break-all font-mono">To: {call.to}</p>
              <p className="break-all font-mono">Value: {call.value}</p>
              <p className="break-all font-mono">Data: {call.data ?? "0x"}</p>
            </div>
          ))}
          {fees.map((fee, index) => (
            <div
              key={index}
              className="bg-background rounded-lg border p-3 text-xs"
            >
              <p className="break-all font-mono">
                Asset: {feeAssetLabel(fee.asset)}
              </p>
              <p className="break-all font-mono">Amount: {fee.amount}</p>
              <p className="break-all font-mono">Recipient: {fee.recipient}</p>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => void decide(false)}
            disabled={approving}
          >
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

function Fact({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-xs" : "font-medium"}>
        {value}
      </span>
    </div>
  );
}

function isCall(value: unknown): value is Call {
  return typeof value === "object" && value !== null;
}

function isFee(value: unknown): value is Fee {
  return typeof value === "object" && value !== null;
}

function feeAssetLabel(asset: unknown): string {
  if (typeof asset !== "object" || asset === null) return "Unknown asset";
  if (!("kind" in asset)) return "Unknown asset";
  if (asset.kind === "native") return "Native";
  return asset.kind === "token" &&
    "address" in asset &&
    typeof asset.address === "string"
    ? asset.address
    : "Unknown asset";
}
