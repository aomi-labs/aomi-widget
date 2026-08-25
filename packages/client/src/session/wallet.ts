import type {
  WalletRequest,
  WalletRequestKind,
  WalletRequestResult,
  WalletSigningPayload,
} from "./types";
import type { WalletSolanaSignPayload, WalletTxPayload } from "../wallet-utils";

type WalletControllerDeps = {
  onChange: (requests: WalletRequest[]) => void;
  resolveAction: (
    request: WalletRequest,
    result: WalletRequestResult,
  ) => Promise<void>;
  rejectAction: (request: WalletRequest, reason?: string) => Promise<void>;
};

/** Pending wallet actions projected exclusively from the Agent v1 protocol. */
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
    const existing = this.find(id);
    const request = this.request(kind, payload, id, existing?.timestamp);
    if (this.resolvedRequestIds.has(id) && !existing) return request;

    this.requests = existing
      ? this.requests.map((current) => (current.id === id ? request : current))
      : [...this.requests, request];
    this.changed();
    return request;
  }

  async resolve(requestId: string, result: WalletRequestResult): Promise<void> {
    const request = this.pending(requestId);
    if (result.kind !== request.kind) {
      throw new Error(
        `WalletRequestResult.kind mismatch for "${requestId}": request is "${request.kind}" but result is "${result.kind}".`,
      );
    }
    if (this.resolvingRequestIds.has(requestId)) return;
    this.resolvingRequestIds.add(requestId);
    try {
      await this.deps.resolveAction(request, result);
      this.finish(request);
    } finally {
      this.resolvingRequestIds.delete(requestId);
    }
  }

  async reject(requestId: string, reason?: string): Promise<void> {
    const request = this.pending(requestId);
    if (this.resolvingRequestIds.has(requestId)) return;
    this.resolvingRequestIds.add(requestId);
    try {
      await this.deps.rejectAction(request, reason);
      this.finish(request);
    } finally {
      this.resolvingRequestIds.delete(requestId);
    }
  }

  dismiss(requestId: string): void {
    const request = this.find(requestId);
    if (request) this.finish(request);
  }

  private pending(requestId: string): WalletRequest {
    const request = this.find(requestId);
    if (!request) {
      throw new Error(`No pending wallet request with id "${requestId}"`);
    }
    return request;
  }

  private finish(request: WalletRequest): void {
    this.requests = this.requests.filter(
      (current) => current.id !== request.id,
    );
    this.resolvedRequestIds.add(request.id);
    this.changed();
  }

  private requestId(
    kind: WalletRequestKind,
    payload: WalletTxPayload | WalletSigningPayload | WalletSolanaSignPayload,
  ): string {
    if (kind === "transaction") {
      const requestId = (payload as WalletTxPayload).requestId;
      if (requestId) return `txreq-${requestId}`;
    } else if (kind === "signing") {
      return (payload as WalletSigningPayload).requestId;
    } else {
      const requestId = (payload as WalletSolanaSignPayload).requestId;
      if (requestId) return requestId;
    }
    return `wreq-${this.nextId++}`;
  }

  private request(
    kind: WalletRequestKind,
    payload: WalletTxPayload | WalletSigningPayload | WalletSolanaSignPayload,
    id: string,
    timestamp = Date.now(),
  ): WalletRequest {
    return { id, kind, payload, timestamp } as WalletRequest;
  }

  private changed(): void {
    this.deps.onChange(this.list());
  }
}
