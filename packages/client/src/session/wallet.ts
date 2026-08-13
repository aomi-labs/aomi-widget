import type { UserState as UserStateShape } from "../user-state";
import {
  hydrateTxPayloadFromUserState,
  normalizeSolanaWalletRequest,
  type WalletSolanaSignPayload,
  type WalletTxPayload,
} from "../wallet-utils";
import type {
  WalletRequest,
  WalletSigningPayload,
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

function solanaPendingIdFields(
  payload: WalletSolanaSignPayload,
): Record<string, number | number[]> {
  const fields: Record<string, number | number[]> = {};
  if (payload.pendingSolanaId !== undefined) {
    fields.pending_solana_id = payload.pendingSolanaId;
  }
  if (
    "pendingSolanaIds" in payload &&
    Array.isArray(payload.pendingSolanaIds) &&
    payload.pendingSolanaIds.length > 0
  ) {
    fields.pending_svm_tx_ids = [...payload.pendingSolanaIds];
  }
  return fields;
}

type WalletControllerDeps = {
  getUserState: () => UserStateShape | undefined;
  resolveUserState: (userState: UserStateShape) => void;
  sendSystemEvent: (type: string, payload: unknown) => Promise<void>;
  completeSigningRequest: (
    requestId: string,
    body:
      | { status: "signed"; signatures: string[] }
      | { status: "rejected"; reason?: string },
  ) => Promise<void>;
  onChange: (requests: WalletRequest[]) => void;
  syncPendingTxRequestsFromUserState: boolean;
};

export class SessionWalletController {
  private requests: WalletRequest[] = [];
  private nextId = 1;
  private resolvedRequestIds = new Set<string>();
  private resolvingRequestIds = new Set<string>();

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
  enqueue(kind: "signing", payload: WalletSigningPayload): WalletRequest;
  enqueue(
    kind: "solana_send" | "solana_sign_and_send",
    payload: WalletSolanaSignPayload,
  ): WalletRequest;
  enqueue(
    kind: WalletRequestKind,
    payload: WalletTxPayload | WalletSigningPayload | WalletSolanaSignPayload,
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
    const pending = isRecord(userState?.pending)
      ? userState.pending
      : undefined;
    const pendingTxs = isRecord(pending?.evm_txs) ? pending.evm_txs : undefined;
    const pendingSolanaTxs = isRecord(pending?.solana_txs)
      ? pending.solana_txs
      : isRecord(pending?.svm_ixs)
        ? pending.svm_ixs
        : undefined;

    const next: WalletRequest[] = [];
    this.syncTransactions(next, pendingTxs);
    this.syncSolana(next, pendingSolanaTxs);

    const nextIdSet = new Set(next.map((request) => request.id));
    for (const existing of this.requests) {
      if (
        existing.kind !== "transaction" &&
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
    if (this.resolvingRequestIds.has(requestId)) return;
    this.resolvingRequestIds.add(requestId);

    try {
      const send = (type: string, payload: unknown) =>
        this.deps.sendSystemEvent(type, payload);
      if (req.kind === "transaction" && result.kind === "transaction") {
        await this.resolveTransaction(req.payload, result);
      } else if (req.kind === "signing" && result.kind === "signing") {
        await this.deps.completeSigningRequest(req.payload.requestId, {
          status: "signed",
          signatures: result.signatures,
        });
      } else if (req.kind === "solana_send" && result.kind === "solana_send") {
        await send("wallet::solana_send_complete", {
          status: "submitted",
          signature: result.signature,
          signed_tx: result.signedTx,
          ...(req.payload.unsignedTx !== undefined
            ? { unsigned_tx: req.payload.unsignedTx }
            : {}),
          description: req.payload.description,
          ...solanaPendingIdFields(req.payload),
        });
      } else if (
        req.kind === "solana_sign_and_send" &&
        result.kind === "solana_sign_and_send"
      ) {
        await send("wallet::solana_sign_and_send_complete", {
          status: "submitted",
          signature: result.signature,
          signed_tx: result.signedTx,
          ...(req.payload.unsignedTx !== undefined
            ? { unsigned_tx: req.payload.unsignedTx }
            : {}),
          description: req.payload.description,
          ...solanaPendingIdFields(req.payload),
        });
      }
      this.finishRequest(req);
    } finally {
      this.resolvingRequestIds.delete(requestId);
    }
  }

  async reject(requestId: string, reason?: string): Promise<void> {
    const req = this.find(requestId);
    if (!req) {
      throw new Error(`No pending wallet request with id "${requestId}"`);
    }
    if (this.resolvingRequestIds.has(requestId)) return;
    this.resolvingRequestIds.add(requestId);

    try {
      const send = (type: string, payload: unknown) =>
        this.deps.sendSystemEvent(type, payload);
      if (req.kind === "transaction") {
        const pendingTxIds = txIdsFromPayload(req.payload);
        await send("wallet:tx_complete", {
          txHash: "",
          status: "failed",
          error: reason ?? "Request rejected",
          pending_tx_ids: pendingTxIds,
          batched: pendingTxIds.length > 1,
          call_count: pendingTxIds.length,
        });
      } else if (req.kind === "signing") {
        await this.deps.completeSigningRequest(req.payload.requestId, {
          status: "rejected",
          reason,
        });
      } else if (req.kind === "solana_send") {
        await send("wallet::solana_send_complete", {
          status: "rejected",
          error: reason ?? "Request rejected",
          ...(req.payload.unsignedTx !== undefined
            ? { unsigned_tx: req.payload.unsignedTx }
            : {}),
          description: req.payload.description,
          ...solanaPendingIdFields(req.payload),
        });
      } else {
        await send("wallet::solana_sign_and_send_complete", {
          status: "rejected",
          error: reason ?? "Request rejected",
          ...(req.payload.unsignedTx !== undefined
            ? { unsigned_tx: req.payload.unsignedTx }
            : {}),
          description: req.payload.description,
          ...solanaPendingIdFields(req.payload),
        });
      }
      this.finishRequest(req);
    } finally {
      this.resolvingRequestIds.delete(requestId);
    }
  }

  /** Drop a request locally after an out-of-band host acknowledgement. */
  dismiss(requestId: string): void {
    const req = this.find(requestId);
    if (!req) return;
    this.finishRequest(req);
  }

  private async resolveTransaction(
    payload: WalletTxPayload,
    result: Extract<WalletRequestResult, { kind: "transaction" }>,
  ): Promise<void> {
    // A sequential executor can land a PREFIX of a batch and then fail.
    // When the result narrows the outcome (`completedTxIds`), the success
    // event below covers only the legs that actually mined, and a second,
    // failed `wallet:tx_complete` reports the rest — so the backend's
    // pending-tx ledger matches the chain instead of re-queuing legs that
    // already spent funds.
    const pendingTxIds = result.completedTxIds ?? txIdsFromPayload(payload);
    // Account-abstraction / sponsorship are backend authority; this path reports
    // only the direct-wallet execution outcome. The backend resolves and records
    // AA state itself (execution-profile + operation endpoints).
    await this.deps.sendSystemEvent("wallet:tx_complete", {
      txHash: result.txHash,
      status: "success",
      amount: result.amount,
      pending_tx_ids: pendingTxIds,
      execution_kind: result.executionKind,
      batched: result.batched ?? pendingTxIds.length > 1,
      call_count: result.callCount ?? pendingTxIds.length,
    });

    if (result.failedTxIds?.length) {
      await this.deps.sendSystemEvent("wallet:tx_complete", {
        txHash: "",
        status: "failed",
        error:
          result.failureReason ??
          "Batch aborted after a mid-sequence failure; these legs were not executed",
        pending_tx_ids: result.failedTxIds,
        batched: result.failedTxIds.length > 1,
        call_count: result.failedTxIds.length,
      });
    }
  }

  private clearResolvedSolanaPending(request: WalletRequest): void {
    const userState = this.deps.getUserState();
    const pending = isRecord(userState?.pending)
      ? userState.pending
      : undefined;
    if (!userState || !pending) return;

    if (request.kind === "transaction" || request.kind === "signing") return;
    const ids =
      "pendingSolanaIds" in request.payload &&
      Array.isArray(request.payload.pendingSolanaIds) &&
      request.payload.pendingSolanaIds.length > 0
        ? request.payload.pendingSolanaIds
        : request.payload.pendingSolanaId !== undefined
          ? [request.payload.pendingSolanaId]
          : [];
    if (ids.length === 0) return;
    const targets: Array<[string, number[]]> = [
      ["svm_ixs", ids],
      ["solana_txs", ids],
    ];

    const nextPending = { ...pending };
    let changed = false;
    for (const [bucketName, ids] of targets) {
      const bucket = isRecord(nextPending[bucketName])
        ? { ...nextPending[bucketName] }
        : undefined;
      if (!bucket) continue;
      for (const id of ids) {
        if (Object.hasOwn(bucket, String(id))) {
          delete bucket[String(id)];
          changed = true;
        }
      }
      nextPending[bucketName] = bucket;
    }

    if (changed) {
      this.deps.resolveUserState({ ...userState, pending: nextPending });
    }
  }

  private finishRequest(request: WalletRequest): void {
    this.remove(request.id);
    this.resolvedRequestIds.add(request.id);
    this.clearResolvedSolanaPending(request);
  }

  private syncTransactions(
    next: WalletRequest[],
    pendingTxs: Record<string, unknown> | undefined,
  ): void {
    const entries = Object.entries(pendingTxs ?? {})
      .filter(([id]) => Number.isInteger(Number(id)))
      // Records held by the backend's AA lane — parked awaiting owner
      // signatures or already submitted through the bundler — must not be
      // re-offered as plain wallet transactions.
      .filter(
        ([, raw]) =>
          !isRecord(raw) ||
          (raw.current_lifecycle !== "awaiting_aa_signature" &&
            raw.current_lifecycle !== "inflight"),
      )
      .sort((left, right) => Number(left[0]) - Number(right[0]));
    const pendingIds = new Set(entries.map(([id]) => Number(id)));
    const covered = new Set<number>();

    const existing = this.requests
      .filter(
        (request): request is Extract<WalletRequest, { kind: "transaction" }> =>
          request.kind === "transaction",
      )
      .map((request) => ({ request, txIds: txIdsFromPayload(request.payload) }))
      .filter(
        ({ txIds }) =>
          txIds.length > 0 && txIds.every((id) => pendingIds.has(id)),
      )
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
          this.requests.find((request) => request.id === requestId)
            ?.timestamp ?? Date.now(),
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
      if (
        !normalized ||
        (normalized.kind !== "solana_send" &&
          normalized.kind !== "solana_sign_and_send")
      )
        continue;

      const requestId = this.requestId(normalized.kind, normalized.payload);
      if (this.resolvedRequestIds.has(requestId)) continue;

      next.push(
        this.request(
          normalized.kind,
          normalized.payload,
          requestId,
          this.requests.find((request) => request.id === requestId)
            ?.timestamp ?? Date.now(),
        ),
      );
    }
  }

  private requestId(
    kind: WalletRequestKind,
    payload: WalletTxPayload | WalletSigningPayload | WalletSolanaSignPayload,
  ): string {
    let id: string | undefined;
    if (kind === "transaction") {
      const txPayload = payload as WalletTxPayload;
      if (
        typeof txPayload.requestId === "string" &&
        txPayload.requestId.length > 0
      ) {
        id = `txreq-${txPayload.requestId}`;
      }
      const txIds = txIdsFromPayload(txPayload);
      if (!id && txIds.length > 0) id = `tx-${txIds.join("-")}`;
    } else if (kind === "signing") {
      id = (payload as WalletSigningPayload).requestId;
    } else {
      const { pendingSolanaId } = payload as WalletSolanaSignPayload;
      if (typeof pendingSolanaId === "number")
        id = `${kind}-${pendingSolanaId}`;
    }
    id ??= `wreq-${this.nextId++}`;
    return id;
  }

  private request(
    kind: WalletRequestKind,
    payload: WalletTxPayload | WalletSigningPayload | WalletSolanaSignPayload,
    id: string,
    timestamp: number,
  ): WalletRequest {
    if (kind === "transaction") {
      return {
        id,
        kind,
        payload: payload as WalletTxPayload,
        timestamp,
      };
    }
    if (kind === "signing") {
      return {
        id,
        kind,
        payload: payload as WalletSigningPayload,
        timestamp,
      };
    }
    return {
      id,
      kind,
      payload: payload as WalletSolanaSignPayload,
      timestamp,
    };
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
