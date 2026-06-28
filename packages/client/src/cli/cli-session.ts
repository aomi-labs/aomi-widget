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
import { createCliClient } from "./client-factory";
import {
  readState,
  hasSameBackendPendingId,
  hasSameSolanaPendingId,
  syncPendingTxsFromUserState,
  writeState,
  type CliSessionState,
  type PendingSolTx,
  type PendingTx,
  type SignedSolTx,
  type SignedTx,
} from "./state";
import { buildCliUserState } from "./user-state";
import { fatal } from "./errors";
import { parseSolanaKeypairSecret } from "./solana-signer";

function applyAccountCredentialConfig(
  state: CliSessionState,
  config: Pick<
    Partial<CliConfig>,
    "accountBearer" | "embeddedProvider" | "embeddedProviderToken"
  >,
): boolean {
  let changed = false;
  const selectsBearer = config.accountBearer !== undefined;
  const selectsProviderExchange =
    config.embeddedProvider !== undefined ||
    config.embeddedProviderToken !== undefined;

  if (selectsBearer) {
    if (state.accountBearer !== config.accountBearer) {
      state.accountBearer = config.accountBearer;
      changed = true;
    }
    if (state.embeddedProvider !== undefined) {
      state.embeddedProvider = undefined;
      changed = true;
    }
    if (state.embeddedProviderToken !== undefined) {
      state.embeddedProviderToken = undefined;
      changed = true;
    }
    return changed;
  }

  if (!selectsProviderExchange) {
    return changed;
  }

  if (state.accountBearer !== undefined) {
    state.accountBearer = undefined;
    changed = true;
  }
  if (
    config.embeddedProvider !== undefined &&
    state.embeddedProvider !== config.embeddedProvider
  ) {
    state.embeddedProvider = config.embeddedProvider;
    changed = true;
  }
  if (
    config.embeddedProviderToken !== undefined &&
    state.embeddedProviderToken !== config.embeddedProviderToken
  ) {
    state.embeddedProviderToken = config.embeddedProviderToken;
    changed = true;
  }
  return changed;
}

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
      baseUrl: config.baseUrl ?? seed?.baseUrl ?? "https://api.aomi.dev",
      app: config.app ?? seed?.app,
      model: config.model ?? seed?.model,
      apiKey: config.apiKey ?? seed?.apiKey,
      accountBearer: seed?.accountBearer,
      sessionCookie: config.sessionCookie ?? seed?.sessionCookie,
      embeddedProvider: seed?.embeddedProvider,
      embeddedProviderToken: seed?.embeddedProviderToken,
      publicKey: config.publicKey ?? seed?.publicKey,
      privateKey: config.privateKey ?? seed?.privateKey,
      svmPublicKey: svmPublicKey ?? seed?.svmPublicKey,
      // Carry forward the persisted Solana private key so `wallet set --solana`
      // survives `--new-session` — signing key is a user preference, not a
      // per-session artifact.
      svmPrivateKey: config.solanaPrivateKey ?? seed?.svmPrivateKey,
      chainId: config.chain ?? seed?.chainId,
      secretHandles: seed?.secretHandles,
    };
    applyAccountCredentialConfig(state, config);
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
  get sessionCookie(): string | undefined {
    return this.state.sessionCookie;
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
    changed = applyAccountCredentialConfig(this.state, config) || changed;
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

  /** Persist the BFF session token established by `aomi login` (SIWE). Clears
   * any static `accountBearer` so the session becomes the single credential. */
  setSessionCookie(sessionCookie: string): void {
    this.state.sessionCookie = sessionCookie;
    this.state.accountBearer = undefined;
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

  /**
   * Persist the operating address(es) for a backend-signed (delegated) wallet —
   * the CLI's blue→yellow step. No private key is stored: signing routes
   * through the backend (blue→pink, keyed on this address), so the address
   * alone must reach `UserState`. Only fills empty slots, so a local
   * self-custody key is never clobbered.
   */
  hydrateOperatingWallet(operating: { evm?: string; svm?: string }): void {
    let changed = false;
    if (operating.evm && !this.state.publicKey) {
      this.state.publicKey = operating.evm;
      changed = true;
    }
    if (operating.svm && !this.state.svmPublicKey) {
      this.state.svmPublicKey = operating.svm;
      changed = true;
    }
    if (changed) {
      this.save();
    }
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
  createClientSession(config: Partial<CliConfig> = {}): ClientSession {
    const resolvedEmbeddedProvider =
      config.accountBearer !== undefined
        ? undefined
        : (config.embeddedProvider ?? this.state.embeddedProvider);
    const resolvedEmbeddedProviderToken =
      config.accountBearer !== undefined
        ? undefined
        : (config.embeddedProviderToken ?? this.state.embeddedProviderToken);
    const shouldUseProviderExchange = Boolean(
      resolvedEmbeddedProvider && resolvedEmbeddedProviderToken,
    );

    const session = new ClientSession(
      createCliClient(
        {
          ...config,
          baseUrl: this.state.baseUrl,
          apiKey: this.state.apiKey,
          // Provider-token exchange is disabled. Keep the persisted fields for
          // compatibility, but do not let them create or replace a bearer.
          accountBearer: shouldUseProviderExchange
            ? undefined
            : (config.accountBearer ?? this.state.accountBearer),
          // SIWE-established BFF session: the CLI mints short-lived bearers from
          // it. Preferred over a static accountBearer when both are present.
          sessionCookie: config.sessionCookie ?? this.state.sessionCookie,
          embeddedProvider: resolvedEmbeddedProvider,
          embeddedProviderToken: resolvedEmbeddedProviderToken,
          secrets: config.secrets ?? {},
        },
        {
          baseUrl: this.state.baseUrl,
          apiKey: this.state.apiKey,
        },
      ),
      {
        sessionId: this.state.sessionId,
        clientId: this.state.clientId,
        app: this.state.app,
        apiKey: this.state.apiKey,
      },
    );
    session.resolveUserState(
      buildCliUserState(this.state.publicKey, this.state.chainId, {
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
