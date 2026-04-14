// =============================================================================
// CliSession — OO wrapper around file-backed CLI session state
// =============================================================================
//
// Replaces the read-modify-write pattern of readState()/writeState() with
// an object whose mutations auto-persist to disk.
//
// Multi-session management (list, activate, delete) stays as free functions
// in state.ts because they operate across all sessions, not on one instance.

import { ClientSession } from "../session";
import type { CliConfig } from "./types";
import {
  readState,
  writeState,
  type CliSessionState,
  type PendingTx,
  type SignedTx,
} from "./state";
import { buildCliUserState } from "./user-state";
import { fatal } from "./errors";

export class CliSession {
  private state: CliSessionState;

  private constructor(state: CliSessionState) {
    this.state = state;
  }

  // ---------------------------------------------------------------------------
  // Static factories
  // ---------------------------------------------------------------------------

  /** Load the active session from disk. Returns null if none exists. */
  static load(): CliSession | null {
    const state = readState();
    return state ? new CliSession(state) : null;
  }

  /** Load existing session or create a fresh one from config. */
  static loadOrCreate(config: CliConfig): CliSession {
    if (config.freshSession) {
      return CliSession.create(config);
    }
    const existing = CliSession.load();
    if (existing) {
      existing.mergeConfig(config);
      return existing;
    }
    return CliSession.create(config);
  }

  /** Create a fresh session and persist it. */
  static create(config: CliConfig): CliSession {
    const state: CliSessionState = {
      sessionId: crypto.randomUUID(),
      clientId: crypto.randomUUID(),
      baseUrl: config.baseUrl,
      app: config.app,
      model: config.model,
      apiKey: config.apiKey,
      publicKey: config.publicKey,
      chainId: config.chain,
    };
    const cli = new CliSession(state);
    cli.save();
    return cli;
  }

  // ---------------------------------------------------------------------------
  // Read-only accessors
  // ---------------------------------------------------------------------------

  get sessionId(): string {
    return this.state.sessionId;
  }
  get baseUrl(): string {
    return this.state.baseUrl;
  }
  get app(): string | undefined {
    return this.state.app;
  }
  get model(): string | undefined {
    return this.state.model;
  }
  get apiKey(): string | undefined {
    return this.state.apiKey;
  }
  get publicKey(): string | undefined {
    return this.state.publicKey;
  }
  get chainId(): number | undefined {
    return this.state.chainId;
  }
  get clientId(): string | undefined {
    return this.state.clientId;
  }
  get pendingTxs(): readonly PendingTx[] {
    return this.state.pendingTxs ?? [];
  }
  get signedTxs(): readonly SignedTx[] {
    return this.state.signedTxs ?? [];
  }
  get secretHandles(): Readonly<Record<string, string>> {
    return this.state.secretHandles ?? {};
  }

  // ---------------------------------------------------------------------------
  // Mutators (auto-persist)
  // ---------------------------------------------------------------------------

  /** Apply config overrides (baseUrl, app, apiKey, publicKey, chain). Only persists if something changed. */
  mergeConfig(config: CliConfig): void {
    let changed = false;

    if (config.baseUrl !== this.state.baseUrl) {
      this.state.baseUrl = config.baseUrl;
      changed = true;
    }
    if (config.app !== this.state.app) {
      this.state.app = config.app;
      changed = true;
    }
    if (config.apiKey !== undefined && config.apiKey !== this.state.apiKey) {
      this.state.apiKey = config.apiKey;
      changed = true;
    }
    if (config.publicKey !== undefined && config.publicKey !== this.state.publicKey) {
      this.state.publicKey = config.publicKey;
      changed = true;
    }
    if (config.chain !== undefined && config.chain !== this.state.chainId) {
      this.state.chainId = config.chain;
      changed = true;
    }
    if (!this.state.clientId) {
      this.state.clientId = crypto.randomUUID();
      changed = true;
    }

    if (changed) this.save();
  }

  setModel(model: string): void {
    this.state.model = model;
    this.save();
  }

  setPublicKey(key: string): void {
    this.state.publicKey = key;
    this.save();
  }

  setChainId(id: number): void {
    this.state.chainId = id;
    this.save();
  }

  addSecretHandles(handles: Record<string, string>): void {
    this.state.secretHandles = { ...(this.state.secretHandles ?? {}), ...handles };
    this.save();
  }

  clearSecretHandles(): void {
    this.state.secretHandles = {};
    this.save();
  }

  /** Ensure clientId exists, generate if absent. Returns the clientId. */
  ensureClientId(): string {
    if (!this.state.clientId) {
      this.state.clientId = crypto.randomUUID();
      this.save();
    }
    return this.state.clientId;
  }

  // ---------------------------------------------------------------------------
  // Transaction methods (auto-persist)
  // ---------------------------------------------------------------------------

  /** Add a pending tx with dedup. Returns null if duplicate. */
  addPendingTx(tx: Omit<PendingTx, "id">): PendingTx | null {
    if (!this.state.pendingTxs) this.state.pendingTxs = [];

    const isDuplicate = this.state.pendingTxs.some(
      (existing) =>
        existing.kind === tx.kind &&
        existing.to === tx.to &&
        existing.data === tx.data &&
        existing.value === tx.value &&
        existing.chainId === tx.chainId,
    );
    if (isDuplicate) return null;

    const pending: PendingTx = {
      ...tx,
      id: this.getNextTxId(),
    };
    this.state.pendingTxs.push(pending);
    this.save();
    return pending;
  }

  removePendingTx(id: string): PendingTx | null {
    if (!this.state.pendingTxs) return null;
    const idx = this.state.pendingTxs.findIndex((tx) => tx.id === id);
    if (idx === -1) return null;
    const [removed] = this.state.pendingTxs.splice(idx, 1);
    this.save();
    return removed;
  }

  addSignedTx(tx: SignedTx): void {
    if (!this.state.signedTxs) this.state.signedTxs = [];
    this.state.signedTxs.push(tx);
    this.save();
  }

  /** Get a pending tx by ID, or fatal() if not found. */
  requirePendingTx(txId: string): PendingTx {
    const pending = this.state.pendingTxs ?? [];
    const tx = pending.find((t) => t.id === txId);
    if (!tx) {
      const available = pending.map((t) => t.id).join(", ") || "(none)";
      fatal(`Transaction "${txId}" not found.\nAvailable: ${available}`);
    }
    return tx;
  }

  /** Get multiple pending txs by ID, or fatal() if any missing or duplicates. */
  requirePendingTxs(txIds: string[]): PendingTx[] {
    const uniqueIds = Array.from(new Set(txIds));
    if (uniqueIds.length !== txIds.length) {
      fatal("Duplicate transaction IDs are not allowed in a single `aomi sign` call.");
    }
    return uniqueIds.map((txId) => this.requirePendingTx(txId));
  }

  // ---------------------------------------------------------------------------
  // Bridge to ClientSession
  // ---------------------------------------------------------------------------

  /** Build a ClientSession from the current state. */
  createClientSession(): ClientSession {
    const session = new ClientSession(
      { baseUrl: this.state.baseUrl, apiKey: this.state.apiKey },
      {
        sessionId: this.state.sessionId,
        clientId: this.state.clientId,
        app: this.state.app,
        apiKey: this.state.apiKey,
        publicKey: this.state.publicKey,
      },
    );
    session.resolveUserState(buildCliUserState(this.state.publicKey, this.state.chainId));
    return session;
  }

  /** Snapshot of the raw state (for backward compat or serialization). */
  toState(): CliSessionState {
    return { ...this.state };
  }

  /** Re-read state from disk (e.g. after another process may have written). */
  reload(): void {
    const fresh = readState();
    if (fresh) {
      this.state = fresh;
    }
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private save(): void {
    writeState(this.state);
  }

  private getNextTxId(): string {
    const allIds = [
      ...(this.state.pendingTxs ?? []),
      ...(this.state.signedTxs ?? []),
    ].map((tx) => {
      const match = tx.id.match(/^tx-(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    });
    const max = allIds.length > 0 ? Math.max(...allIds) : 0;
    return `tx-${max + 1}`;
  }
}
