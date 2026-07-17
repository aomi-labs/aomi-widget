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
  hasSameBackendPendingId,
  hasSameSolanaPendingId,
  syncPendingTxsFromUserState,
  writeState,
  type CliAuthSession,
  type CliSessionState,
  type PendingSolTx,
  type PendingTx,
  type SignedSolTx,
  type SignedTx,
} from "./state";
import { buildCliUserState } from "./user-state";
import { fatal } from "./errors";
import { parseSolanaKeypairSecret } from "./solana-signer";
import { createCliAuthTokenProvider } from "./auth";
import { DEFAULT_CLI_BASE_URL } from "./client-factory";
import { createCliPaymentFetch, type CliPaymentListener } from "./payment";

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
      const existing = CliSession.load();
      return CliSession.create(config, existing?.toState());
    }
    const existing = CliSession.load();
    if (existing) {
      existing.mergeConfig(config);
      return existing;
    }
    return CliSession.create(config);
  }

  /** Create a fresh session and persist it. */
  static create(config: CliConfig, seed?: CliSessionState): CliSession {
    // Derive Solana public key from private key when provided.
    let svmPublicKey: string | undefined;
    if (config.solanaPrivateKey) {
      try {
        svmPublicKey = parseSolanaKeypairSecret(
          config.solanaPrivateKey,
        ).publicKey.toBase58();
      } catch {
        // Ignore — signing will produce a clearer error at sign time.
      }
    }

    const state: CliSessionState = {
      sessionId: crypto.randomUUID(),
      clientId: crypto.randomUUID(),
      baseUrl: config.baseUrl ?? seed?.baseUrl ?? DEFAULT_CLI_BASE_URL,
      app: config.app ?? seed?.app,
      model: config.model ?? seed?.model,
      apiKey: config.apiKey ?? seed?.apiKey,
      accountBearer: config.accountBearer ?? seed?.accountBearer,
      sessionCookie: config.sessionCookie ?? seed?.sessionCookie,
      embeddedProvider: config.embeddedProvider ?? seed?.embeddedProvider,
      embeddedProviderToken:
        config.embeddedProviderToken ?? seed?.embeddedProviderToken,
      publicKey: config.publicKey ?? seed?.publicKey,
      privateKey: seed?.privateKey,
      svmPublicKey: svmPublicKey ?? seed?.svmPublicKey,
      // Carry forward only persisted Solana keys from `wallet set --solana`.
      // Keys supplied via --solana-private-key/env stay transient.
      svmPrivateKey: seed?.svmPrivateKey,
      chainId: config.chain ?? seed?.chainId,
      aaProvider: config.aaProvider ?? seed?.aaProvider,
      aaMode: config.aaMode ?? seed?.aaMode,
      secretHandles: seed?.secretHandles,
      auth: seed?.auth,
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
  get modelSynced(): boolean {
    return this.state.modelSynced === true;
  }
  get apiKey(): string | undefined {
    return this.state.apiKey;
  }
  get publicKey(): string | undefined {
    return this.state.publicKey;
  }
  get privateKey(): string | undefined {
    return this.state.privateKey;
  }
  get svmPublicKey(): string | undefined {
    return this.state.svmPublicKey;
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
  get pendingSolTxs(): readonly PendingSolTx[] {
    return this.state.pendingSolTxs ?? [];
  }
  get signedSolTxs(): readonly SignedSolTx[] {
    return this.state.signedSolTxs ?? [];
  }
  get signedTxs(): readonly SignedTx[] {
    return this.state.signedTxs ?? [];
  }
  get secretHandles(): Readonly<Record<string, string>> {
    return this.state.secretHandles ?? {};
  }
  get auth(): CliAuthSession | undefined {
    return this.state.auth;
  }

  // ---------------------------------------------------------------------------
  // Mutators (auto-persist)
  // ---------------------------------------------------------------------------

  /**
   * Apply config overrides (baseUrl, app, apiKey, publicKey, chain). Only
   * persists if something changed. Fields left `undefined` on the input are
   * NOT clobbered — settings commands like `wallet set` pass partial configs
   * and must not wipe out an existing `baseUrl`.
   */
  mergeConfig(config: Partial<CliConfig>): void {
    let changed = false;

    if (config.baseUrl !== undefined && config.baseUrl !== this.state.baseUrl) {
      this.state.baseUrl = config.baseUrl;
      changed = true;
    }
    if (config.app !== undefined && config.app !== this.state.app) {
      this.state.app = config.app;
      changed = true;
    }
    if (config.apiKey !== undefined && config.apiKey !== this.state.apiKey) {
      this.state.apiKey = config.apiKey;
      changed = true;
    }
    if (
      config.accountBearer !== undefined &&
      config.accountBearer !== this.state.accountBearer
    ) {
      this.state.accountBearer = config.accountBearer;
      delete this.state.embeddedProvider;
      delete this.state.embeddedProviderToken;
      changed = true;
    }
    if (
      config.sessionCookie !== undefined &&
      config.sessionCookie !== this.state.sessionCookie
    ) {
      this.state.sessionCookie = config.sessionCookie;
      changed = true;
    }
    if (
      config.embeddedProvider !== undefined &&
      config.embeddedProvider !== this.state.embeddedProvider
    ) {
      this.state.embeddedProvider = config.embeddedProvider;
      delete this.state.accountBearer;
      changed = true;
    }
    if (
      config.embeddedProviderToken !== undefined &&
      config.embeddedProviderToken !== this.state.embeddedProviderToken
    ) {
      this.state.embeddedProviderToken = config.embeddedProviderToken;
      delete this.state.accountBearer;
      changed = true;
    }
    if (
      config.publicKey !== undefined &&
      config.publicKey !== this.state.publicKey
    ) {
      this.state.publicKey = config.publicKey;
      changed = true;
    }
    // Derive and persist the Solana public key when a keypair secret is provided.
    if (config.solanaPrivateKey !== undefined) {
      try {
        const svmPub = parseSolanaKeypairSecret(
          config.solanaPrivateKey,
        ).publicKey.toBase58();
        if (svmPub !== this.state.svmPublicKey) {
          this.state.svmPublicKey = svmPub;
          changed = true;
        }
      } catch {
        // Ignore parse failures — signing will produce a clearer error at sign time.
      }
    }
    if (config.chain !== undefined && config.chain !== this.state.chainId) {
      this.state.chainId = config.chain;
      changed = true;
    }
    if (
      config.aaProvider !== undefined &&
      config.aaProvider !== this.state.aaProvider
    ) {
      this.state.aaProvider = config.aaProvider;
      changed = true;
    }
    if (config.aaMode !== undefined && config.aaMode !== this.state.aaMode) {
      this.state.aaMode = config.aaMode;
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
    this.state.modelSynced = true;
    this.save();
  }

  setPublicKey(key: string): void {
    this.state.publicKey = key;
    this.save();
  }

  setBaseUrl(url: string): void {
    this.state.baseUrl = url;
    this.save();
  }

  setPrivateKey(key: string): void {
    this.state.privateKey = key;
    this.save();
  }

  setWallet(privateKey: string, publicKey: string): void {
    this.state.privateKey = privateKey;
    this.state.publicKey = publicKey;
    this.save();
  }

  setSvmWallet(privateKey: string, publicKey: string): void {
    this.state.svmPrivateKey = privateKey;
    this.state.svmPublicKey = publicKey;
    this.save();
  }

  /** The Solana private key to use for signing. Prefers the transiently-
   * supplied `solanaPrivateKey` from `CliConfig` (i.e. `--solana-private-key`)
   * and falls back to the key persisted by `wallet set --solana`. */
  resolvedSvmPrivateKey(fromConfig?: string): string | undefined {
    return fromConfig ?? this.state.svmPrivateKey;
  }

  setChainId(id: number): void {
    this.state.chainId = id;
    this.save();
  }

  addSecretHandles(handles: Record<string, string>): void {
    this.state.secretHandles = {
      ...(this.state.secretHandles ?? {}),
      ...handles,
    };
    this.save();
  }

  clearSecretHandles(): void {
    this.state.secretHandles = {};
    this.save();
  }

  setAuthSession(auth: CliAuthSession): void {
    this.state.auth = auth;
    this.save();
  }

  clearAuthSession(): void {
    if (!this.state.auth) return;
    delete this.state.auth;
    this.save();
  }

  clearSigningKeys(): void {
    let changed = false;
    if (this.state.privateKey !== undefined) {
      delete this.state.privateKey;
      changed = true;
    }
    if (this.state.svmPrivateKey !== undefined) {
      delete this.state.svmPrivateKey;
      changed = true;
    }
    if (changed) this.save();
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

    const isDuplicate = this.state.pendingTxs.some((existing) =>
      hasSameBackendPendingId(existing, tx),
    );
    if (isDuplicate) return null;

    const pending: PendingTx = {
      ...tx,
      id: this.getDisplayTxId(tx),
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

  /** Add a pending Solana tx with dedup on `solanaId`. */
  addPendingSolTx(tx: Omit<PendingSolTx, "id">): PendingSolTx | null {
    if (!this.state.pendingSolTxs) this.state.pendingSolTxs = [];

    const isDuplicate = this.state.pendingSolTxs.some((existing) =>
      hasSameSolanaPendingId(existing, tx),
    );
    if (isDuplicate) return null;

    const pending: PendingSolTx = {
      ...tx,
      id: `tx-${tx.solanaId}`,
    };
    this.state.pendingSolTxs.push(pending);
    this.save();
    return pending;
  }

  removePendingSolTx(id: string): PendingSolTx | null {
    if (!this.state.pendingSolTxs) return null;
    const idx = this.state.pendingSolTxs.findIndex((tx) => tx.id === id);
    if (idx === -1) return null;
    const [removed] = this.state.pendingSolTxs.splice(idx, 1);
    this.save();
    return removed;
  }

  addSignedSolTx(tx: SignedSolTx): void {
    if (!this.state.signedSolTxs) this.state.signedSolTxs = [];
    this.state.signedSolTxs.push(tx);
    this.save();
  }

  syncPendingFromUserState(
    userState: Parameters<typeof syncPendingTxsFromUserState>[1],
  ): {
    pendingTxs: readonly PendingTx[];
    pendingSolTxs: readonly PendingSolTx[];
  } {
    const result = syncPendingTxsFromUserState(this.state, userState);
    this.reload();
    return result;
  }

  /** Find a pending Solana tx by display id, or undefined if unknown. */
  findPendingSolTx(txId: string): PendingSolTx | undefined {
    return (this.state.pendingSolTxs ?? []).find((tx) => tx.id === txId);
  }

  /** Find a pending EVM/EIP-712 tx by display id, or undefined. */
  findPendingTx(txId: string): PendingTx | undefined {
    return (this.state.pendingTxs ?? []).find((tx) => tx.id === txId);
  }

  /** Get a pending tx by ID, or fatal() if not found. */
  requirePendingTx(txId: string): PendingTx {
    const pending = this.state.pendingTxs ?? [];
    const tx = pending.find((t) => t.id === txId);
    if (!tx) {
      const available = this.allDisplayIds().join(", ") || "(none)";
      fatal(`Transaction "${txId}" not found.\nAvailable: ${available}`);
    }
    return tx;
  }

  /** Get multiple pending txs by ID, or fatal() if any missing or duplicates. */
  requirePendingTxs(txIds: string[]): PendingTx[] {
    const uniqueIds = Array.from(new Set(txIds));
    if (uniqueIds.length !== txIds.length) {
      fatal(
        "Duplicate transaction IDs are not allowed in a single `aomi tx sign` call.",
      );
    }
    return uniqueIds.map((txId) => this.requirePendingTx(txId));
  }

  /** Get a pending Solana tx by ID, or fatal() if not found. */
  requirePendingSolTx(txId: string): PendingSolTx {
    const tx = this.findPendingSolTx(txId);
    if (!tx) {
      const available = this.allDisplayIds().join(", ") || "(none)";
      fatal(`Solana transaction "${txId}" not found.\nAvailable: ${available}`);
    }
    return tx;
  }

  private allDisplayIds(): string[] {
    return [
      ...(this.state.pendingTxs ?? []).map((tx) => tx.id),
      ...(this.state.pendingSolTxs ?? []).map((tx) => tx.id),
    ];
  }

  // ---------------------------------------------------------------------------
  // Bridge to ClientSession
  // ---------------------------------------------------------------------------

  /** Build a ClientSession from the current state. */
  createClientSession(
    config?: Partial<CliConfig>,
    options?: { onPayment?: CliPaymentListener },
  ): ClientSession {
    const paymentFetch = createCliPaymentFetch(config, options?.onPayment);
    const session = new ClientSession(
      {
        baseUrl: this.state.baseUrl,
        apiKey: this.state.apiKey,
        fetch: paymentFetch,
        getAccountBearer: createCliAuthTokenProvider(() => this.state),
      },
      {
        sessionId: this.state.sessionId,
        clientId: this.state.clientId,
        app: this.state.app,
        applicationId: config?.applicationId,
        apiKey: this.state.apiKey,
        paymentMethod: config?.paymentMethod,
      },
    );
    session.resolveUserState(
      buildCliUserState(this.state.publicKey, this.state.chainId, {
        app: this.state.app,
        aaProvider: this.state.aaProvider ?? config?.aaProvider ?? null,
        aaMode: this.state.aaMode ?? null,
        smartAccount: this.state.smartAccount ?? null,
        svmAddress: this.state.svmPublicKey,
      }),
    );
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

  private getDisplayTxId(tx: Omit<PendingTx, "id">): string {
    if (typeof tx.txId === "number") return `tx-${tx.txId}`;
    if (typeof tx.eip712Id === "number") return `tx-${tx.eip712Id}`;
    return this.getNextTxId();
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
