import {
  aaModeFromExecutionKind,
  aaRequestedModeFromPreference,
} from "../aa/policy";
import type { UserState as UserStateShape } from "../user-state";
import {
  hydrateTxPayloadFromUserState,
  normalizeEip712Payload,
  normalizeSolanaWalletRequest,
  type WalletEip712Payload,
  type WalletSolanaSignMessagePayload,
  type WalletSolanaSignPayload,
  type WalletTxPayload,
} from "../wallet-utils";
import type {
  WalletRequest,
  WalletRequestKind,
  WalletRequestResult,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function txIdsFromPayload(payload: WalletTxPayload): number[] {
  if (Array.isArray(payload.txIds) && payload.txIds.length > 0) {
    return [...payload.txIds];
  }
  if (typeof payload.txId === "number") {
    return [payload.txId];
  }
  return [];
}

type WalletControllerDeps = {
  getUserState: () => UserStateShape | undefined;
  resolveUserState: (userState: UserStateShape) => void;
  sendSystemEvent: (type: string, payload: unknown) => Promise<void>;
  onChange: (requests: WalletRequest[]) => void;
  syncPendingTxRequestsFromUserState: boolean;
};

export class SessionWalletController {
  private requests: WalletRequest[] = [];
  private nextId = 1;
  private resolvedRequestIds = new Set<string>();

  constructor(private readonly deps: WalletControllerDeps) {}

  get length(): number {
    return this.requests.length;
  }

  list(): WalletRequest[] {
    return [...this.requests];
  }

  find(id: string): WalletRequest | undefined {
    return this.requests.find((request) => request.id === id);
  }

  enqueue(kind: "transaction", payload: WalletTxPayload): WalletRequest;
  enqueue(kind: "eip712_sign", payload: WalletEip712Payload): WalletRequest;
  enqueue(kind: "solana_sign", payload: WalletSolanaSignPayload): WalletRequest;
  enqueue(
    kind: "solana_sign_message",
    payload: WalletSolanaSignMessagePayload,
  ): WalletRequest;
  enqueue(
    kind: "solana_send" | "solana_sign_and_send",
    payload: WalletSolanaSignPayload,
  ): WalletRequest;
  enqueue(
    kind: WalletRequestKind,
    payload:
      | WalletTxPayload
      | WalletEip712Payload
      | WalletSolanaSignPayload
      | WalletSolanaSignMessagePayload,
  ): WalletRequest {
    const id = this.requestId(kind, payload);
    const existing = this.requests.find((request) => request.id === id);
    const timestamp = existing?.timestamp ?? Date.now();
    const req = this.request(kind, payload, id, timestamp);

    if (this.resolvedRequestIds.has(id) && !existing) {
      return req;
    }

    this.requests = existing
      ? this.requests.map((request) => (request.id === id ? req : request))
      : [...this.requests, req];
    this.dedupeTransactionRequests(req);
    this.changed();
    return req;
  }

  remove(id: string): WalletRequest | null {
    const idx = this.requests.findIndex((request) => request.id === id);
    if (idx === -1) return null;
    const [request] = this.requests.splice(idx, 1);
    this.changed();
    return request;
  }

  sync(): void {
    const userState = this.deps.getUserState();
    const pending = isRecord(userState?.pending) ? userState.pending : undefined;
    const pendingTxs = isRecord(pending?.evm_txs) ? pending.evm_txs : undefined;
    const pendingEip712s = isRecord(pending?.evm_sigs)
      ? pending.evm_sigs
      : undefined;
    const pendingSolanaTxs = isRecord(pending?.solana_txs)
      ? pending.solana_txs
      : isRecord(pending?.svm_ixs)
        ? pending.svm_ixs
        : undefined;
    const pendingSolanaSigs = isRecord(pending?.solana_sigs)
      ? pending.solana_sigs
      : isRecord(pending?.svm_sigs)
        ? pending.svm_sigs
        : undefined;

    const next: WalletRequest[] = [];
    this.syncTransactions(next, pendingTxs);
    this.syncEip712(next, pendingEip712s);
    this.syncSolana(next, pendingSolanaTxs);
    this.syncSolana(next, pendingSolanaSigs);

    const nextIdSet = new Set(next.map((request) => request.id));
    for (const existing of this.requests) {
      if (
        existing.kind !== "transaction" &&
        existing.kind !== "eip712_sign" &&
        !nextIdSet.has(existing.id) &&
        !this.resolvedRequestIds.has(existing.id)
      ) {
        next.push(existing);
      }
    }

    if (this.sameRequests(next)) return;
    this.requests = next;
    this.changed();
  }

  async resolve(requestId: string, result: WalletRequestResult): Promise<void> {
    const req = this.find(requestId);
    if (!req) {
      throw new Error(`No pending wallet request with id "${requestId}"`);
    }
    if (result.kind !== req.kind) {
      throw new Error(
        `WalletRequestResult.kind mismatch for "${requestId}": request is "${req.kind}" but result is "${result.kind}".`,
      );
    }
    this.remove(requestId);
    this.resolvedRequestIds.add(requestId);

    if (req.kind === "transaction" && result.kind === "transaction") {
      await this.resolveTransaction(req.payload, result);
    } else if (req.kind === "eip712_sign" && result.kind === "eip712_sign") {
      await this.deps.sendSystemEvent("wallet_eip712_response", {
        status: "success",
        signature: result.signature,
        description: req.payload.description,
        ...(req.payload.eip712Id !== undefined
          ? { pending_eip712_id: req.payload.eip712Id }
          : {}),
      });
    } else if (req.kind === "solana_sign" && result.kind === "solana_sign") {
      await this.deps.sendSystemEvent("wallet::solana_sign_complete", {
        status: "signed",
        signed_tx: result.signedTx,
        ...(req.payload.unsignedTx !== undefined
          ? { unsigned_tx: req.payload.unsignedTx }
          : {}),
        description: req.payload.description,
        ...(req.payload.pendingSolanaId !== undefined
          ? { pending_solana_id: req.payload.pendingSolanaId }
          : {}),
      });
    } else if (
      req.kind === "solana_sign_message" &&
      result.kind === "solana_sign_message"
    ) {
      await this.deps.sendSystemEvent("wallet::solana_sign_message_complete", {
        status: "signed",
        signature: result.signature,
        ...(req.payload.message !== undefined
          ? { message: req.payload.message }
          : {}),
        description: req.payload.description,
        ...(req.payload.pendingSolanaId !== undefined
          ? { pending_solana_id: req.payload.pendingSolanaId }
          : {}),
      });
    } else if (req.kind === "solana_send" && result.kind === "solana_send") {
      await this.deps.sendSystemEvent("wallet::solana_send_complete", {
        status: "submitted",
        signature: result.signature,
        signed_tx: result.signedTx,
        ...(req.payload.unsignedTx !== undefined
          ? { unsigned_tx: req.payload.unsignedTx }
          : {}),
        description: req.payload.description,
        ...(req.payload.pendingSolanaId !== undefined
          ? { pending_solana_id: req.payload.pendingSolanaId }
          : {}),
      });
    } else if (
      req.kind === "solana_sign_and_send" &&
      result.kind === "solana_sign_and_send"
    ) {
      await this.deps.sendSystemEvent("wallet::solana_sign_and_send_complete", {
        status: "submitted",
        signature: result.signature,
        signed_tx: result.signedTx,
        ...(req.payload.unsignedTx !== undefined
          ? { unsigned_tx: req.payload.unsignedTx }
          : {}),
        description: req.payload.description,
        ...(req.payload.pendingSolanaId !== undefined
          ? { pending_solana_id: req.payload.pendingSolanaId }
          : {}),
      });
    }
  }

  async reject(requestId: string, reason?: string): Promise<void> {
    const req = this.remove(requestId);
    if (!req) {
      throw new Error(`No pending wallet request with id "${requestId}"`);
    }
    this.resolvedRequestIds.add(requestId);

    if (req.kind === "transaction") {
      const pendingTxIds = txIdsFromPayload(req.payload);
      const requestedMode = aaRequestedModeFromPreference(req.payload.aaPreference);
      await this.deps.sendSystemEvent("wallet:tx_complete", {
        txHash: "",
        status: "failed",
        error: reason ?? "Request rejected",
        pending_tx_ids: pendingTxIds,
        aa_requested_mode: requestedMode,
        aa_resolved_mode: requestedMode,
        batched: pendingTxIds.length > 1,
        call_count: pendingTxIds.length,
      });
    } else if (req.kind === "eip712_sign") {
      await this.deps.sendSystemEvent("wallet_eip712_response", {
        status: "failed",
        error: reason ?? "Request rejected",
        description: req.payload.description,
        ...(req.payload.eip712Id !== undefined
          ? { pending_eip712_id: req.payload.eip712Id }
          : {}),
      });
    } else if (req.kind === "solana_sign") {
      await this.deps.sendSystemEvent("wallet::solana_sign_complete", {
        status: "rejected",
        error: reason ?? "Request rejected",
        ...(req.payload.unsignedTx !== undefined
          ? { unsigned_tx: req.payload.unsignedTx }
          : {}),
        description: req.payload.description,
        ...(req.payload.pendingSolanaId !== undefined
          ? { pending_solana_id: req.payload.pendingSolanaId }
          : {}),
      });
    } else if (req.kind === "solana_sign_message") {
      await this.deps.sendSystemEvent("wallet::solana_sign_message_complete", {
        status: "rejected",
        error: reason ?? "Request rejected",
        ...(req.payload.message !== undefined
          ? { message: req.payload.message }
          : {}),
        description: req.payload.description,
        ...(req.payload.pendingSolanaId !== undefined
          ? { pending_solana_id: req.payload.pendingSolanaId }
          : {}),
      });
    } else if (req.kind === "solana_send") {
      await this.deps.sendSystemEvent("wallet::solana_send_complete", {
        status: "rejected",
        error: reason ?? "Request rejected",
        ...(req.payload.unsignedTx !== undefined
          ? { unsigned_tx: req.payload.unsignedTx }
          : {}),
        description: req.payload.description,
        ...(req.payload.pendingSolanaId !== undefined
          ? { pending_solana_id: req.payload.pendingSolanaId }
          : {}),
      });
    } else {
      await this.deps.sendSystemEvent("wallet::solana_sign_and_send_complete", {
        status: "rejected",
        error: reason ?? "Request rejected",
        ...(req.payload.unsignedTx !== undefined
          ? { unsigned_tx: req.payload.unsignedTx }
          : {}),
        description: req.payload.description,
        ...(req.payload.pendingSolanaId !== undefined
          ? { pending_solana_id: req.payload.pendingSolanaId }
          : {}),
      });
    }
  }

  private async resolveTransaction(
    payload: WalletTxPayload,
    result: Extract<WalletRequestResult, { kind: "transaction" }>,
  ): Promise<void> {
    const pendingTxIds = txIdsFromPayload(payload);
    const requestedMode =
      result.aaRequestedMode ?? aaRequestedModeFromPreference(payload.aaPreference);
    const resolvedMode =
      result.aaResolvedMode ??
      aaModeFromExecutionKind(result.executionKind) ??
      requestedMode;
    const userState = this.deps.getUserState();
    const prevEvm = isRecord(userState?.evm) ? userState.evm : {};
    const prevAa = isRecord(prevEvm.aa) ? prevEvm.aa : {};
    this.deps.resolveUserState({
      ...(userState ?? {}),
      evm: {
        ...prevEvm,
        aa: {
          ...prevAa,
          mode: resolvedMode,
          smart_account:
            resolvedMode === "4337" ? result.SmartAccount4337 ?? null : null,
          delegation_7702:
            resolvedMode === "7702" ? result.Delegation7702 ?? null : null,
        },
      },
    });
    await this.deps.sendSystemEvent("wallet:tx_complete", {
      txHash: result.txHash,
      status: "success",
      amount: result.amount,
      pending_tx_ids: pendingTxIds,
      aa_requested_mode: requestedMode,
      aa_resolved_mode: resolvedMode,
      aa_fallback_reason: result.aaFallbackReason,
      execution_kind: result.executionKind,
      batched: result.batched ?? pendingTxIds.length > 1,
      call_count: result.callCount ?? pendingTxIds.length,
      sponsored: result.sponsored,
      smart_account_4337: result.SmartAccount4337,
      delegation_7702: result.Delegation7702,
    });
  }

  private syncTransactions(
    next: WalletRequest[],
    pendingTxs: Record<string, unknown> | undefined,
  ): void {
    const entries = Object.entries(pendingTxs ?? {})
      .filter(([id]) => Number.isInteger(Number(id)))
      .sort((left, right) => Number(left[0]) - Number(right[0]));
    const pendingIds = new Set(entries.map(([id]) => Number(id)));
    const covered = new Set<number>();

    const existing = this.requests
      .filter(
        (request): request is Extract<WalletRequest, { kind: "transaction" }> =>
          request.kind === "transaction",
      )
      .map((request) => ({ request, txIds: txIdsFromPayload(request.payload) }))
      .filter(({ txIds }) => txIds.length > 0 && txIds.every((id) => pendingIds.has(id)))
      .sort((left, right) =>
        left.txIds.length !== right.txIds.length
          ? right.txIds.length - left.txIds.length
          : left.request.timestamp - right.request.timestamp,
      );

    for (const { request, txIds } of existing) {
      if (txIds.some((txId) => covered.has(txId))) continue;
      const payload = hydrateTxPayloadFromUserState(
        request.payload,
        this.deps.getUserState(),
      );
      next.push({
        id: this.requestId("transaction", payload),
        kind: "transaction",
        payload,
        timestamp: request.timestamp,
      });
      txIds.forEach((txId) => covered.add(txId));
    }

    if (!this.deps.syncPendingTxRequestsFromUserState) return;
    for (const [id, raw] of entries) {
      const txId = Number(id);
      if (covered.has(txId)) continue;
      const payload = hydrateTxPayloadFromUserState(
        { txId, txIds: [txId], aaPreference: "auto" },
        { pending: { evm_txs: { [id]: isRecord(raw) ? raw : {} } } },
      );
      const requestId = this.requestId("transaction", payload);
      next.push({
        id: requestId,
        kind: "transaction",
        payload,
        timestamp:
          this.requests.find((request) => request.id === requestId)?.timestamp ??
          Date.now(),
      });
    }
  }

  private syncEip712(
    next: WalletRequest[],
    pendingEip712s: Record<string, unknown> | undefined,
  ): void {
    for (const [id, raw] of Object.entries(pendingEip712s ?? {}).sort(
      (left, right) => Number(left[0]) - Number(right[0]),
    )) {
      const payload = normalizeEip712Payload({
        ...(isRecord(raw) ? raw : {}),
        pending_eip712_id: Number(id),
      });
      const requestId = this.requestId("eip712_sign", payload);
      next.push({
        id: requestId,
        kind: "eip712_sign",
        payload,
        timestamp:
          this.requests.find((request) => request.id === requestId)?.timestamp ??
          Date.now(),
      });
    }
  }

  private syncSolana(
    next: WalletRequest[],
    pendingSolanaRequests: Record<string, unknown> | undefined,
  ): void {
    for (const [id, raw] of Object.entries(pendingSolanaRequests ?? {}).sort(
      (left, right) => Number(left[0]) - Number(right[0]),
    )) {
      const normalized = normalizeSolanaWalletRequest({
        ...(isRecord(raw) ? raw : {}),
        chain_kind: "svm",
        pending_solana_id: Number(id),
      });
      if (!normalized) continue;

      const requestId = this.requestId(normalized.kind, normalized.payload);
      if (this.resolvedRequestIds.has(requestId)) continue;

      next.push(
        this.request(
          normalized.kind,
          normalized.payload,
          requestId,
          this.requests.find((request) => request.id === requestId)?.timestamp ??
            Date.now(),
        ),
      );
    }
  }

  private requestId(
    kind: WalletRequestKind,
    payload:
      | WalletTxPayload
      | WalletEip712Payload
      | WalletSolanaSignPayload
      | WalletSolanaSignMessagePayload,
  ): string {
    if (kind === "transaction") {
      const txPayload = payload as WalletTxPayload;
      if (typeof txPayload.requestId === "string" && txPayload.requestId.length > 0) {
        return `txreq-${txPayload.requestId}`;
      }
      const txIds = txIdsFromPayload(txPayload);
      if (txIds.length > 0) return `tx-${txIds.join("-")}`;
    } else if (kind === "eip712_sign") {
      const { eip712Id } = payload as WalletEip712Payload;
      if (typeof eip712Id === "number") return `eip712-${eip712Id}`;
    } else {
      const { pendingSolanaId } = payload as
        | WalletSolanaSignPayload
        | WalletSolanaSignMessagePayload;
      if (typeof pendingSolanaId === "number") return `${kind}-${pendingSolanaId}`;
    }
    return `wreq-${this.nextId++}`;
  }

  private request(
    kind: WalletRequestKind,
    payload:
      | WalletTxPayload
      | WalletEip712Payload
      | WalletSolanaSignPayload
      | WalletSolanaSignMessagePayload,
    id: string,
    timestamp: number,
  ): WalletRequest {
    if (kind === "transaction") {
      return { id, kind, payload: payload as WalletTxPayload, timestamp };
    }
    if (kind === "eip712_sign") {
      return { id, kind, payload: payload as WalletEip712Payload, timestamp };
    }
    if (kind === "solana_sign_message") {
      return {
        id,
        kind,
        payload: payload as WalletSolanaSignMessagePayload,
        timestamp,
      };
    }
    return { id, kind, payload: payload as WalletSolanaSignPayload, timestamp };
  }

  private dedupeTransactionRequests(req: WalletRequest): void {
    if (req.kind !== "transaction") return;
    const nextTxIds = txIdsFromPayload(req.payload);
    if (nextTxIds.length === 0) return;
    const nextTxIdSet = new Set(nextTxIds);
    this.requests = this.requests.filter((request) => {
      if (request.id === req.id || request.kind !== "transaction") return true;
      const requestTxIds = txIdsFromPayload(request.payload);
      return (
        requestTxIds.length === 0 ||
        !requestTxIds.every((txId) => nextTxIdSet.has(txId))
      );
    });
  }

  private sameRequests(next: WalletRequest[]): boolean {
    return (
      next.length === this.requests.length &&
      next.every((request, index) => {
        const current = this.requests[index];
        return (
          current?.id === request.id &&
          current.kind === request.kind &&
          JSON.stringify(current.payload) === JSON.stringify(request.payload)
        );
      })
    );
  }

  private changed(): void {
    this.deps.onChange(this.list());
  }
}
