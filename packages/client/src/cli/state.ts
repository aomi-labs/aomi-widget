import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import { homedir, tmpdir } from "node:os";

export type PendingTx = {
  id: string;
  kind: "transaction" | "eip712_sign";
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
  txHash?: string;
  txHashes?: string[];
  executionKind?: string;
  aaProvider?: string;
  aaMode?: string;
  batched?: boolean;
  sponsored?: boolean;
  AAAddress?: string;
  delegationAddress?: string;
  signature?: string;
  from?: string;
  to?: string;
  value?: string;
  chainId?: number;
  description?: string;
  timestamp: number;
};

export type CliSessionState = {
  sessionId: string;
  clientId?: string;
  baseUrl: string;
  app?: string;
  model?: string;
  apiKey?: string;
  publicKey?: string;
  chainId?: number;
  pendingTxs?: PendingTx[];
  signedTxs?: SignedTx[];
  secretHandles?: Record<string, string>;
};

type StoredSessionState = CliSessionState & {
  localId: number;
  createdAt: number;
  updatedAt: number;
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

const LEGACY_STATE_FILE = join(
  process.env.XDG_RUNTIME_DIR ?? tmpdir(),
  "aomi-session.json",
);

export const STATE_ROOT_DIR =
  process.env.AOMI_STATE_DIR ?? join(homedir(), ".aomi");
export const SESSIONS_DIR = join(STATE_ROOT_DIR, "sessions");
const ACTIVE_SESSION_FILE = join(STATE_ROOT_DIR, "active-session.txt");

function ensureStorageDirs(): void {
  mkdirSync(SESSIONS_DIR, { recursive: true });
}

function parseSessionFileLocalId(filename: string): number | null {
  const match = filename.match(/^session-(\d+)\.json$/);
  if (!match) return null;
  const localId = parseInt(match[1], 10);
  return Number.isNaN(localId) ? null : localId;
}

function toSessionFilePath(localId: number): string {
  return join(SESSIONS_DIR, `${SESSION_FILE_PREFIX}${localId}${SESSION_FILE_SUFFIX}`);
}

function toCliSessionState(stored: StoredSessionState): CliSessionState {
  return {
    sessionId: stored.sessionId,
    clientId: stored.clientId,
    baseUrl: stored.baseUrl,
    app: stored.app,
    model: stored.model,
    apiKey: stored.apiKey,
    publicKey: stored.publicKey,
    chainId: stored.chainId,
    pendingTxs: stored.pendingTxs,
    signedTxs: stored.signedTxs,
    secretHandles: stored.secretHandles,
  };
}

function readStoredSession(path: string): StoredSessionState | null {
  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw) as Partial<StoredSessionState>;

    if (typeof parsed.sessionId !== "string" || typeof parsed.baseUrl !== "string") {
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
      publicKey: parsed.publicKey,
      chainId: parsed.chainId,
      pendingTxs: parsed.pendingTxs,
      signedTxs: parsed.signedTxs,
      secretHandles: parsed.secretHandles,
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
    writeFileSync(ACTIVE_SESSION_FILE, String(localId));
  } catch {
    // Ignore active pointer write failures.
  }
}

function readAllStoredSessions(): StoredSessionState[] {
  try {
    ensureStorageDirs();
    const filenames = readdirSync(SESSIONS_DIR)
      .map((name) => ({ name, localId: parseSessionFileLocalId(name) }))
      .filter((entry): entry is { name: string; localId: number } =>
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
    const legacy = JSON.parse(raw) as CliSessionState;
    if (!legacy.sessionId || !legacy.baseUrl) {
      return;
    }

    const now = Date.now();
    const migrated: StoredSessionState = {
      ...legacy,
      localId: 1,
      createdAt: now,
      updatedAt: now,
    };

    ensureStorageDirs();
    writeFileSync(toSessionFilePath(1), JSON.stringify(migrated, null, 2));
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

function toStoredSessionRecord(stored: StoredSessionState): StoredSessionRecord {
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

export function deleteStoredSession(selector: string): StoredSessionRecord | null {
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
    const remaining = readAllStoredSessions().sort((a, b) => b.updatedAt - a.updatedAt);
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

  writeFileSync(toSessionFilePath(localId), JSON.stringify(payload, null, 2));
  writeActiveLocalId(localId);
}

export function clearState(): void {
  migrateLegacyStateIfNeeded();
  writeActiveLocalId(null);
}

function getNextTxId(state: CliSessionState): string {
  const allIds = [...(state.pendingTxs ?? []), ...(state.signedTxs ?? [])].map((tx) => {
    const match = tx.id.match(/^tx-(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  });
  const max = allIds.length > 0 ? Math.max(...allIds) : 0;
  return `tx-${max + 1}`;
}

export function addPendingTx(
  state: CliSessionState,
  tx: Omit<PendingTx, "id">,
): PendingTx {
  if (!state.pendingTxs) state.pendingTxs = [];

  const pending: PendingTx = {
    ...tx,
    id: getNextTxId(state),
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

export function addSignedTx(
  state: CliSessionState,
  tx: SignedTx,
): void {
  if (!state.signedTxs) state.signedTxs = [];
  state.signedTxs.push(tx);
  writeState(state);
}
