import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import { homedir, tmpdir } from "node:os";
import {
  UserState as UserStateHelpers,
  type UserStateAAMode,
  type UserState,
} from "../user-state";
import {
  pendingTxsFromBackendUserState,
  pendingSolTxsFromBackendUserState,
  walletSnapshotFromUserState,
} from "./user-state";
import type { CliAAProvider, CliEmbeddedProvider } from "./types";

export type PendingTx = {
  id: string;
  kind: "transaction" | "eip712_sign";
  txId?: number;
  eip712Id?: number;
  to?: string;
  value?: string;
  data?: string;
  chainId?: number;
  description?: string;
  timestamp: number;
  payload: Record<string, unknown>;
};

export type SignedTx = {
  id: string;
  kind: "transaction" | "eip712_sign";
  /** Authoritative backend staging id used to make callback recovery safe. */
  pendingTxId?: number;
  txHash?: string;
  txHashes?: string[];
  executionKind?: string;
  aaProvider?: string;
  aaMode?: string;
  batched?: boolean;
  sponsored?: boolean;
  smartAccount4337?: string;
  Delegation7702?: string;
  signature?: string;
  from?: string;
  to?: string;
  value?: string;
  chainId?: number;
  description?: string;
  /** True once the backend acknowledged this confirmed transaction. */
  backendNotified?: boolean;
  serviceFeeStatus?: "confirmed" | "failed" | "not_attempted";
  serviceFeeAmountWei?: string;
  serviceFeeRecipient?: string;
  serviceFeeTxHash?: string;
  serviceFeeError?: string;
  timestamp: number;
};

/** Solana wallet request waiting for the local CLI signer. */
export type PendingSolTx = {
  id: string;
  /** Backend-assigned id for the staged Solana sign request. */
  solanaId: number;
  /** All staged backend ids covered by this transaction. */
  solanaIds?: number[];
  /** Wallet operation requested by the backend. */
  requestKind?:
    | "solana_sign"
    | "solana_sign_message"
    | "solana_send"
    | "solana_sign_and_send";
  /** Base64 unsigned transaction for transaction requests. */
  unsignedTx?: string;
  /** Base64 message bytes for `solana_sign_message`. */
  message?: string;
  /** CAIP-2 cluster, e.g. "solana:mainnet" / "solana:devnet". */
  cluster?: string;
  /** Base58 pubkey the host expects to sign (informational; CLI signs
   *  with whatever local keypair the user provides). */
  signer?: string;
  description?: string;
  timestamp: number;
  payload: Record<string, unknown>;
};

/**
 * Signed Solana record persisted locally for `aomi tx list`. The bound
 * artifact is `signedTx` (base64 of the full signed bytes, ready to
 * splice into a `submit_*` continuation).
 */
export type SignedSolTx = {
  id: string;
  requestKind?: PendingSolTx["requestKind"];
  signedTx?: string;
  signer: string;
  signature?: string;
  cluster?: string;
  description?: string;
  timestamp: number;
};

export type CliAuthSession = {
  sessionToken: string;
  expiresAt: number;
  walletFamily?: "evm" | "svm";
  walletAddress?: string;
  chainId?: number;
  chainScope?: string;
  betterAuthUserId?: string;
};

export type CliSessionState = {
  sessionId: string;
  clientId?: string;
  baseUrl: string;
  app?: string;
  model?: string;
  /** Whether the active model has been pushed to the backend session. */
  modelSynced?: boolean;
  apiKey?: string;
  /** Aomi account bearer for authenticated requests. Persisted so a bearer
   * supplied once (via `--account-bearer`) survives across CLI invocations. */
  accountBearer?: string;
  /** Legacy persisted session token slot. New logins write BetterAuth bearer
   * sessions to `auth`; this remains for older local state migration. */
  sessionCookie?: string;
  /** Deprecated legacy provider-exchange config. */
  embeddedProvider?: CliEmbeddedProvider;
  /** Deprecated legacy provider-exchange config. */
  embeddedProviderToken?: string;
  publicKey?: string;
  privateKey?: string;
  /** Solana public key (base58), derived from the Solana keypair when provided. */
  svmPublicKey?: string;
  /** Canonical CAIP-2 Solana cluster selected for this session. */
  svmCluster?: "solana:mainnet" | "solana:devnet" | "solana:testnet";
  /** Solana private key (base58), persisted by `wallet set --solana`. Used as
   * the signing key fallback when `--solana-private-key` is not passed on a
   * command. Never printed in output. */
  svmPrivateKey?: string;
  chainId?: number;
  aaProvider?: CliAAProvider;
  aaMode?: UserStateAAMode | null;
  smartAccount?: string | null;
  pendingTxs?: PendingTx[];
  pendingSolTxs?: PendingSolTx[];
  signedTxs?: SignedTx[];
  signedSolTxs?: SignedSolTx[];
  secretHandles?: Record<string, string>;
  auth?: CliAuthSession;
};

function getBackendPendingId(
  tx: Omit<PendingTx, "id"> | PendingTx,
): number | undefined {
  return tx.kind === "transaction" ? tx.txId : tx.eip712Id;
}

export function hasSameBackendPendingId(
  existing: PendingTx,
  next: Omit<PendingTx, "id">,
): boolean {
  const existingBackendId = getBackendPendingId(existing);
  const nextBackendId = getBackendPendingId(next);

  return (
    existing.kind === next.kind &&
    existingBackendId !== undefined &&
    nextBackendId !== undefined &&
    existingBackendId === nextBackendId
  );
}

type StoredSessionState = CliSessionState & {
  localId: number;
  createdAt: number;
  updatedAt: number;
};

type LegacySignedTx = SignedTx & {
  AAAddress?: string;
};

type LegacyStoredSessionState = Omit<StoredSessionState, "signedTxs"> & {
  signedTxs?: LegacySignedTx[];
};

export type StoredSessionRecord = {
  localId: number;
  sessionId: string;
  path: string;
  createdAt: number;
  updatedAt: number;
  state: CliSessionState;
};

const SESSION_FILE_PREFIX = "session-";
const SESSION_FILE_SUFFIX = ".json";
const STATE_DIR_MODE = 0o700;
const STATE_FILE_MODE = 0o600;

const LEGACY_STATE_FILE = join(
  process.env.XDG_RUNTIME_DIR ?? tmpdir(),
  "aomi-session.json",
);

export const STATE_ROOT_DIR =
  process.env.AOMI_STATE_DIR ?? join(homedir(), ".aomi");
export const SESSIONS_DIR = join(STATE_ROOT_DIR, "sessions");
const ACTIVE_SESSION_FILE = join(STATE_ROOT_DIR, "active-session.txt");

function ensureStorageDirs(): void {
  mkdirSync(SESSIONS_DIR, { recursive: true, mode: STATE_DIR_MODE });
  try {
    chmodSync(STATE_ROOT_DIR, STATE_DIR_MODE);
    chmodSync(SESSIONS_DIR, STATE_DIR_MODE);
  } catch {
    // Best effort only; writes still proceed so the CLI remains usable.
  }
}

function parseSessionFileLocalId(filename: string): number | null {
  const match = filename.match(/^session-(\d+)\.json$/);
  if (!match) return null;
  const localId = parseInt(match[1], 10);
  return Number.isNaN(localId) ? null : localId;
}

function toSessionFilePath(localId: number): string {
  return join(
    SESSIONS_DIR,
    `${SESSION_FILE_PREFIX}${localId}${SESSION_FILE_SUFFIX}`,
  );
}

function toCliSessionState(stored: StoredSessionState): CliSessionState {
  return {
    sessionId: stored.sessionId,
    clientId: stored.clientId,
    baseUrl: stored.baseUrl,
    app: stored.app,
    model: stored.model,
    modelSynced: stored.modelSynced,
    apiKey: stored.apiKey,
    accountBearer: stored.accountBearer,
    sessionCookie: stored.sessionCookie,
    embeddedProvider: stored.embeddedProvider,
    embeddedProviderToken: stored.embeddedProviderToken,
    publicKey: stored.publicKey,
    privateKey: stored.privateKey,
    svmPublicKey: stored.svmPublicKey,
    svmCluster: stored.svmCluster,
    svmPrivateKey: stored.svmPrivateKey,
    chainId: stored.chainId,
    aaProvider: stored.aaProvider,
    aaMode: stored.aaMode,
    smartAccount: stored.smartAccount,
    pendingTxs: stored.pendingTxs,
    pendingSolTxs: stored.pendingSolTxs,
    signedTxs: stored.signedTxs,
    signedSolTxs: stored.signedSolTxs,
    secretHandles: stored.secretHandles,
    auth: stored.auth,
  };
}

function normalizeSignedTx(tx: LegacySignedTx): SignedTx {
  const { AAAddress: _legacyAAAddress, ...rest } = tx;
  return {
    ...rest,
    smartAccount4337: tx.smartAccount4337 ?? tx.AAAddress,
  };
}

function normalizeSignedTxs(
  signedTxs: LegacyStoredSessionState["signedTxs"],
): SignedTx[] | undefined {
  return signedTxs?.map(normalizeSignedTx);
}

function readStoredSession(path: string): StoredSessionState | null {
  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw) as Partial<LegacyStoredSessionState>;

    if (
      typeof parsed.sessionId !== "string" ||
      typeof parsed.baseUrl !== "string"
    ) {
      return null;
    }

    const fallbackLocalId = parseSessionFileLocalId(basename(path)) ?? 0;
    return {
      sessionId: parsed.sessionId,
      clientId: parsed.clientId,
      baseUrl: parsed.baseUrl,
      app: parsed.app,
      model: parsed.model,
      apiKey: parsed.apiKey,
      accountBearer: parsed.accountBearer,
      sessionCookie: parsed.sessionCookie,
      embeddedProvider: parsed.embeddedProvider,
      embeddedProviderToken: parsed.embeddedProviderToken,
      publicKey: parsed.publicKey,
      privateKey: parsed.privateKey,
      svmPublicKey: parsed.svmPublicKey,
      svmCluster: parsed.svmCluster,
      svmPrivateKey: parsed.svmPrivateKey,
      chainId: parsed.chainId,
      aaProvider: parsed.aaProvider,
      aaMode: parsed.aaMode,
      smartAccount: parsed.smartAccount,
      pendingTxs: parsed.pendingTxs,
      pendingSolTxs: parsed.pendingSolTxs,
      signedTxs: normalizeSignedTxs(parsed.signedTxs),
      signedSolTxs: parsed.signedSolTxs,
      secretHandles: parsed.secretHandles,
      auth: normalizeAuthSession(parsed.auth),
      localId:
        typeof parsed.localId === "number" && parsed.localId > 0
          ? parsed.localId
          : fallbackLocalId,
      createdAt:
        typeof parsed.createdAt === "number" && parsed.createdAt > 0
          ? parsed.createdAt
          : Date.now(),
      updatedAt:
        typeof parsed.updatedAt === "number" && parsed.updatedAt > 0
          ? parsed.updatedAt
          : Date.now(),
    };
  } catch {
    return null;
  }
}

function normalizeAuthSession(value: unknown): CliAuthSession | undefined {
  if (!value || typeof value !== "object") return undefined;
  const auth = value as Partial<CliAuthSession>;
  if (
    typeof auth.sessionToken !== "string" ||
    !auth.sessionToken ||
    typeof auth.expiresAt !== "number" ||
    !Number.isFinite(auth.expiresAt)
  ) {
    return undefined;
  }
  return {
    sessionToken: auth.sessionToken,
    expiresAt: auth.expiresAt,
    walletFamily: auth.walletFamily,
    walletAddress: auth.walletAddress,
    chainId: auth.chainId,
    chainScope: auth.chainScope,
    betterAuthUserId: auth.betterAuthUserId,
  };
}

function readActiveLocalId(): number | null {
  try {
    if (!existsSync(ACTIVE_SESSION_FILE)) return null;
    const raw = readFileSync(ACTIVE_SESSION_FILE, "utf-8").trim();
    if (!raw) return null;
    const parsed = parseInt(raw, 10);
    return Number.isNaN(parsed) ? null : parsed;
  } catch {
    return null;
  }
}

function writeActiveLocalId(localId: number | null): void {
  try {
    if (localId === null) {
      if (existsSync(ACTIVE_SESSION_FILE)) {
        rmSync(ACTIVE_SESSION_FILE);
      }
      return;
    }
    ensureStorageDirs();
    writeFileSync(ACTIVE_SESSION_FILE, String(localId), {
      mode: STATE_FILE_MODE,
    });
    try {
      chmodSync(ACTIVE_SESSION_FILE, STATE_FILE_MODE);
    } catch {
      // Best-effort hardening only.
    }
  } catch {
    // Ignore active pointer write failures.
  }
}

function readAllStoredSessions(): StoredSessionState[] {
  try {
    ensureStorageDirs();
    const filenames = readdirSync(SESSIONS_DIR)
      .map((name) => ({ name, localId: parseSessionFileLocalId(name) }))
      .filter(
        (entry): entry is { name: string; localId: number } =>
          entry.localId !== null,
      )
      .sort((a, b) => a.localId - b.localId);

    const sessions: StoredSessionState[] = [];
    for (const entry of filenames) {
      const path = join(SESSIONS_DIR, entry.name);
      const stored = readStoredSession(path);
      if (stored) {
        sessions.push(stored);
      }
    }

    return sessions;
  } catch {
    return [];
  }
}

function getNextLocalId(sessions: StoredSessionState[]): number {
  const maxLocalId = sessions.reduce((max, session) => {
    return session.localId > max ? session.localId : max;
  }, 0);
  return maxLocalId + 1;
}

let _migrationDone = false;

function migrateLegacyStateIfNeeded(): void {
  if (_migrationDone) return;
  _migrationDone = true;

  if (!existsSync(LEGACY_STATE_FILE)) return;

  const existing = readAllStoredSessions();
  if (existing.length > 0) {
    // Storage already migrated. Keep legacy file untouched.
    return;
  }

  try {
    const raw = readFileSync(LEGACY_STATE_FILE, "utf-8");
    const legacy = JSON.parse(raw) as Partial<
      Omit<CliSessionState, "signedTxs"> & { signedTxs?: LegacySignedTx[] }
    >;
    if (!legacy.sessionId || !legacy.baseUrl) {
      return;
    }

    const now = Date.now();
    const migrated: StoredSessionState = {
      ...legacy,
      sessionId: legacy.sessionId,
      baseUrl: legacy.baseUrl,
      signedTxs: normalizeSignedTxs(legacy.signedTxs),
      localId: 1,
      createdAt: now,
      updatedAt: now,
    };

    ensureStorageDirs();
    const migratedPath = toSessionFilePath(1);
    writeFileSync(migratedPath, JSON.stringify(migrated, null, 2), {
      mode: STATE_FILE_MODE,
    });
    try {
      chmodSync(migratedPath, STATE_FILE_MODE);
    } catch {
      // Best-effort hardening only.
    }
    writeActiveLocalId(1);
    rmSync(LEGACY_STATE_FILE);
  } catch {
    // Best-effort migration only.
  }
}

function resolveStoredSession(
  selector: string,
  sessions: StoredSessionState[],
): StoredSessionState | null {
  const trimmed = selector.trim();
  if (!trimmed) return null;

  const localMatch = trimmed.match(/^(?:session-)?(\d+)$/);
  if (localMatch) {
    const localId = parseInt(localMatch[1], 10);
    if (!Number.isNaN(localId)) {
      return sessions.find((session) => session.localId === localId) ?? null;
    }
  }

  return sessions.find((session) => session.sessionId === trimmed) ?? null;
}

function toStoredSessionRecord(
  stored: StoredSessionState,
): StoredSessionRecord {
  return {
    localId: stored.localId,
    sessionId: stored.sessionId,
    path: toSessionFilePath(stored.localId),
    createdAt: stored.createdAt,
    updatedAt: stored.updatedAt,
    state: toCliSessionState(stored),
  };
}

export function getActiveStateFilePath(): string | null {
  migrateLegacyStateIfNeeded();
  const sessions = readAllStoredSessions();
  const activeLocalId = readActiveLocalId();
  if (activeLocalId === null) return null;
  const active = sessions.find((session) => session.localId === activeLocalId);
  return active ? toSessionFilePath(active.localId) : null;
}

export function listStoredSessions(): StoredSessionRecord[] {
  migrateLegacyStateIfNeeded();
  return readAllStoredSessions().map(toStoredSessionRecord);
}

export function setActiveSession(selector: string): StoredSessionRecord | null {
  migrateLegacyStateIfNeeded();
  const sessions = readAllStoredSessions();
  const target = resolveStoredSession(selector, sessions);
  if (!target) return null;
  writeActiveLocalId(target.localId);
  return toStoredSessionRecord(target);
}

export function deleteStoredSession(
  selector: string,
): StoredSessionRecord | null {
  migrateLegacyStateIfNeeded();
  const sessions = readAllStoredSessions();
  const target = resolveStoredSession(selector, sessions);
  if (!target) return null;

  const targetPath = toSessionFilePath(target.localId);
  try {
    if (existsSync(targetPath)) {
      rmSync(targetPath);
    }
  } catch {
    return null;
  }

  const activeLocalId = readActiveLocalId();
  if (activeLocalId === target.localId) {
    const remaining = readAllStoredSessions().sort(
      (a, b) => b.updatedAt - a.updatedAt,
    );
    writeActiveLocalId(remaining[0]?.localId ?? null);
  }

  return toStoredSessionRecord(target);
}

export function readState(): CliSessionState | null {
  migrateLegacyStateIfNeeded();

  const sessions = readAllStoredSessions();
  if (sessions.length === 0) return null;

  const activeLocalId = readActiveLocalId();
  if (activeLocalId === null) {
    return null;
  }

  const active =
    sessions.find((session) => session.localId === activeLocalId) ?? null;
  if (!active) {
    writeActiveLocalId(null);
    return null;
  }

  return toCliSessionState(active);
}

export function writeState(state: CliSessionState): void {
  migrateLegacyStateIfNeeded();
  ensureStorageDirs();

  const sessions = readAllStoredSessions();
  const activeLocalId = readActiveLocalId();

  const existingBySessionId = sessions.find(
    (session) => session.sessionId === state.sessionId,
  );
  const existingByActive =
    activeLocalId !== null
      ? sessions.find((session) => session.localId === activeLocalId)
      : undefined;
  const existing = existingBySessionId ?? existingByActive;

  const now = Date.now();
  const localId = existing?.localId ?? getNextLocalId(sessions);
  const createdAt = existing?.createdAt ?? now;

  const payload: StoredSessionState = {
    ...state,
    localId,
    createdAt,
    updatedAt: now,
  };

  const stateFilePath = toSessionFilePath(localId);
  writeFileSync(stateFilePath, JSON.stringify(payload, null, 2), {
    mode: STATE_FILE_MODE,
  });
  try {
    chmodSync(stateFilePath, STATE_FILE_MODE);
  } catch {
    // Best-effort hardening only.
  }
  writeActiveLocalId(localId);
}

export function clearState(): void {
  migrateLegacyStateIfNeeded();
  writeActiveLocalId(null);
}

function getNextTxId(state: CliSessionState): string {
  const allIds = [
    ...(state.pendingTxs ?? []),
    ...(state.pendingSolTxs ?? []),
    ...(state.signedTxs ?? []),
    ...(state.signedSolTxs ?? []),
  ].map((tx) => {
    const match = tx.id.match(/^tx-(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  });
  const max = allIds.length > 0 ? Math.max(...allIds) : 0;
  return `tx-${max + 1}`;
}

function toBackendDisplayId(tx: Omit<PendingTx, "id">): string | undefined {
  const pendingId = getBackendPendingId(tx);
  return pendingId !== undefined ? `tx-${pendingId}` : undefined;
}

export function addPendingTx(
  state: CliSessionState,
  tx: Omit<PendingTx, "id">,
): PendingTx | null {
  if (!state.pendingTxs) state.pendingTxs = [];

  // Requests are only deduped when they carry the same backend staging id.
  const isDuplicate = state.pendingTxs.some((existing) =>
    hasSameBackendPendingId(existing, tx),
  );
  if (isDuplicate) {
    return null;
  }

  const pending: PendingTx = {
    ...tx,
    id: toBackendDisplayId(tx) ?? getNextTxId(state),
  };
  state.pendingTxs.push(pending);
  writeState(state);
  return pending;
}

export function removePendingTx(
  state: CliSessionState,
  id: string,
): PendingTx | null {
  if (!state.pendingTxs) return null;
  const idx = state.pendingTxs.findIndex((tx) => tx.id === id);
  if (idx === -1) return null;
  const [removed] = state.pendingTxs.splice(idx, 1);
  writeState(state);
  return removed;
}

export function addSignedTx(state: CliSessionState, tx: SignedTx): void {
  if (!state.signedTxs) state.signedTxs = [];
  const index = state.signedTxs.findIndex(
    (existing) =>
      (tx.pendingTxId !== undefined &&
        existing.pendingTxId === tx.pendingTxId &&
        existing.kind === tx.kind) ||
      (existing.id === tx.id && existing.kind === tx.kind),
  );
  if (index === -1) {
    state.signedTxs.push(tx);
  } else {
    state.signedTxs[index] = { ...state.signedTxs[index], ...tx };
  }
  state.pendingTxs = (state.pendingTxs ?? []).filter(
    (pending) =>
      !(
        pending.kind === tx.kind &&
        ((tx.pendingTxId !== undefined && pending.txId === tx.pendingTxId) ||
          pending.id === tx.id)
      ),
  );
  writeState(state);
}

export function hasSameSolanaPendingId(
  existing: PendingSolTx,
  next: Omit<PendingSolTx, "id">,
): boolean {
  return existing.solanaId === next.solanaId;
}

export function addPendingSolTx(
  state: CliSessionState,
  tx: Omit<PendingSolTx, "id">,
): PendingSolTx | null {
  if (!state.pendingSolTxs) state.pendingSolTxs = [];

  const isDuplicate = state.pendingSolTxs.some((existing) =>
    hasSameSolanaPendingId(existing, tx),
  );
  if (isDuplicate) {
    return null;
  }

  const pending: PendingSolTx = {
    ...tx,
    id: `tx-${tx.solanaId}`,
  };
  state.pendingSolTxs.push(pending);
  writeState(state);
  return pending;
}

export function removePendingSolTx(
  state: CliSessionState,
  id: string,
): PendingSolTx | null {
  if (!state.pendingSolTxs) return null;
  const idx = state.pendingSolTxs.findIndex((tx) => tx.id === id);
  if (idx === -1) return null;
  const [removed] = state.pendingSolTxs.splice(idx, 1);
  writeState(state);
  return removed;
}

export function addSignedSolTx(state: CliSessionState, tx: SignedSolTx): void {
  if (!state.signedSolTxs) state.signedSolTxs = [];
  state.signedSolTxs.push(tx);
  writeState(state);
}

export type SyncPendingTxsResult = {
  pendingTxs: PendingTx[];
  pendingSolTxs: PendingSolTx[];
};

export function syncPendingTxsFromUserState(
  state: CliSessionState,
  userState: UserState | null | undefined,
): SyncPendingTxsResult {
  const normalizedUserState = UserStateHelpers.normalize(userState);
  const walletSnapshot = walletSnapshotFromUserState(normalizedUserState);
  const isConnected = UserStateHelpers.isConnected(normalizedUserState);

  if (walletSnapshot.publicKey !== undefined) {
    state.publicKey = walletSnapshot.publicKey;
  } else if (isConnected === false) {
    state.publicKey = undefined;
  }

  if (walletSnapshot.chainId !== undefined) {
    state.chainId = walletSnapshot.chainId;
  } else if (isConnected === false) {
    state.chainId = undefined;
  }

  // AA mode / smart account are backend authority and no longer round-tripped
  // through user_state; the CLI keeps its own `--aa` preference locally.

  state.pendingTxs = pendingTxsFromBackendUserState(
    normalizedUserState,
    state.pendingTxs ?? [],
  );
  state.pendingSolTxs = pendingSolTxsFromBackendUserState(
    normalizedUserState,
    state.pendingSolTxs ?? [],
  );
  writeState(state);
  return {
    pendingTxs: state.pendingTxs,
    pendingSolTxs: state.pendingSolTxs,
  };
}
