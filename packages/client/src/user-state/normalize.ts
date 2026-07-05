import type { UserState } from "./index";

type UnknownRecord = Record<string, unknown>;

function asObject(value: unknown): UnknownRecord | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as UnknownRecord;
}

function asObjectArray(value: unknown): UnknownRecord[] | undefined {
  if (Array.isArray(value)) {
    const records = value.flatMap((item) => {
      const obj = asObject(item);
      return obj ? [obj] : [];
    });
    return records.length ? records : undefined;
  }
  const obj = asObject(value);
  return obj ? [obj] : undefined;
}

function firstEvm(value: unknown): UnknownRecord | undefined {
  return asObjectArray(value)?.[0];
}

function pick(record: UnknownRecord | undefined, ...keys: string[]): unknown {
  if (!record) {
    return undefined;
  }
  for (const key of keys) {
    if (
      Object.prototype.hasOwnProperty.call(record, key) &&
      record[key] !== undefined
    ) {
      return record[key];
    }
  }
  return undefined;
}

function assignDefined(target: UnknownRecord, key: string, value: unknown): void {
  if (value !== undefined) {
    target[key] = value;
  }
}

function renameKey(obj: UnknownRecord, from: string, to: string): void {
  if (from === to) return;
  if (Object.prototype.hasOwnProperty.call(obj, from)) {
    if (!(to in obj) || obj[to] === undefined) {
      obj[to] = obj[from];
    }
    delete obj[from];
  }
}

function liftFlat(
  obj: UnknownRecord,
  flat: UnknownRecord | undefined,
  to: string,
  fromKeys: string[],
): void {
  if (to in obj && obj[to] !== undefined) return;
  const value = pick(flat, ...fromKeys);
  if (value !== undefined) {
    obj[to] = value;
  }
}

const OPAQUE_PENDING_KEYS = new Set(["typed_data", "typedData", "domain"]);

function camelToSnake(key: string): string {
  return key.replace(/([A-Z])/g, "_$1").toLowerCase();
}

function snakeizePendingValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(snakeizePendingValue);
  }
  const obj = asObject(value);
  if (!obj) return value;
  const out: UnknownRecord = {};
  for (const [key, val] of Object.entries(obj)) {
    const snake = camelToSnake(key);
    out[snake] =
      OPAQUE_PENDING_KEYS.has(key) || OPAQUE_PENDING_KEYS.has(snake)
        ? val
        : snakeizePendingValue(val);
  }
  return out;
}

function snakeizeBucket(bucket: unknown): UnknownRecord | undefined {
  const obj = asObject(bucket);
  if (!obj) return undefined;
  const out: UnknownRecord = {};
  for (const [id, value] of Object.entries(obj)) {
    out[id] = snakeizePendingValue(value);
  }
  return out;
}

function buildConnection(
  src: UnknownRecord | undefined,
  flat: UnknownRecord,
): UnknownRecord | undefined {
  const c: UnknownRecord = { ...(src ?? {}) };
  renameKey(c, "isConnected", "is_connected");
  renameKey(c, "providerLabel", "provider_label");
  renameKey(c, "walletProviderSubject", "wallet_provider_subject");
  renameKey(c, "authMethod", "auth_method");
  renameKey(c, "authValue", "auth_value");
  renameKey(c, "authVerifiedAt", "auth_verified_at");
  liftFlat(c, flat, "is_connected", ["is_connected", "isConnected"]);
  liftFlat(c, flat, "provider", ["wallet_provider", "walletProvider"]);
  liftFlat(c, flat, "wallet_provider_subject", [
    "wallet_provider_subject",
    "walletProviderSubject",
  ]);
  liftFlat(c, flat, "auth_method", ["auth_method", "authMethod"]);
  liftFlat(c, flat, "auth_value", ["auth_value", "authValue"]);
  liftFlat(c, flat, "auth_verified_at", ["auth_verified_at", "authVerifiedAt"]);
  // `connection.is_connected` is a non-`Option` `bool` on the backend; an
  // explicit `null` fails serde with a 400. Drop it (defaults to false).
  dropNullKeys(c, "is_connected");
  return Object.keys(c).length ? c : undefined;
}

function buildEvm(
  src: UnknownRecord | undefined,
  flat: UnknownRecord,
): UnknownRecord | undefined {
  const e: UnknownRecord = { ...(src ?? {}) };
  renameKey(e, "chainId", "chain_id");
  renameKey(e, "ensName", "ens_name");

  const aa: UnknownRecord = { ...(asObject(e.aa) ?? {}) };
  delete e.aa;
  renameKey(aa, "smartAccount", "smart_account");
  renameKey(aa, "delegation7702", "delegation_7702");
  liftFlat(aa, flat, "mode", ["aa_mode", "aaMode"]);
  liftFlat(aa, flat, "smart_account", [
    "smart_account_4337",
    "smartAccount4337",
    "smart_account",
    "smartAccount",
  ]);
  liftFlat(aa, flat, "delegation_7702", ["delegation_7702", "delegation7702"]);
  if (Object.keys(aa).length) e.aa = aa;

  const sponsorship: UnknownRecord = { ...(asObject(e.sponsorship) ?? {}) };
  delete e.sponsorship;
  renameKey(sponsorship, "sponsorProvider", "sponsor_provider");
  renameKey(sponsorship, "sponsorAccount", "sponsor_account");
  liftFlat(sponsorship, flat, "sponsored", ["sponsored"]);
  liftFlat(sponsorship, flat, "sponsor_provider", [
    "sponsor_provider",
    "sponsorProvider",
  ]);
  liftFlat(sponsorship, flat, "sponsor_account", [
    "sponsor_account",
    "sponsorAccount",
  ]);
  if (Object.keys(sponsorship).length) e.sponsorship = sponsorship;

  liftFlat(e, flat, "address", ["address"]);
  liftFlat(e, flat, "chain_id", ["chain_id", "chainId"]);
  if (e.chain_id != null) {
    const cid = parseChainId(e.chain_id);
    if (cid !== undefined) e.chain_id = cid;
    else delete e.chain_id;
  }
  liftFlat(e, flat, "ens_name", ["ens_name", "ensName"]);
  return Object.keys(e).length ? e : undefined;
}

function buildSvm(
  src: UnknownRecord | undefined,
  flat: UnknownRecord,
): UnknownRecord | undefined {
  const s: UnknownRecord = { ...(src ?? {}) };
  renameKey(s, "walletName", "wallet_name");
  liftFlat(s, flat, "address", ["svm_address", "svmAddress"]);
  // `svm.capabilities` is a non-`Option` `Vec` on the backend; an explicit
  // `null` fails serde with a 400 (the staging chat-portal regression). Drop it
  // when null/undefined — absence defaults to an empty capability set.
  dropNullKeys(s, "capabilities");
  return Object.keys(s).length ? s : undefined;
}

function buildPending(
  src: UnknownRecord | undefined,
  flat: UnknownRecord,
): UnknownRecord | undefined {
  const p: UnknownRecord = {};
  assignDefined(
    p,
    "evm_txs",
    snakeizeBucket(
      pick(src, "evm_txs", "evmTxs") ?? pick(flat, "pending_txs", "pendingTxs"),
    ),
  );
  assignDefined(
    p,
    "evm_sigs",
    snakeizeBucket(
      pick(src, "evm_sigs", "evmSigs") ??
        pick(flat, "pending_eip712s", "pendingEip712s"),
    ),
  );
  assignDefined(
    p,
    "svm_ixs",
    snakeizeBucket(
      pick(src, "svm_ixs", "svmIxs", "solana_txs", "solanaTxs") ??
        pick(flat, "pending_solana_txs", "pendingSolanaTxs"),
    ),
  );
  assignDefined(
    p,
    "svm_sigs",
    snakeizeBucket(pick(src, "svm_sigs", "svmSigs", "solana_sigs", "solanaSigs")),
  );
  return Object.keys(p).length ? p : undefined;
}

/**
 * Delete keys whose value is an explicit `null`/`undefined`.
 *
 * Only safe for backend fields that are NOT `Option<…>` — serde rejects an
 * explicit `null` for those with a deserialize error → HTTP 400. Most fields
 * here are `Option<…>` where `null` is a meaningful tombstone (e.g. AA
 * mode-exclusive clears `evm.aa.delegation_7702: null`), so callers must list
 * only the genuinely non-nullable wire fields.
 */
function dropNullKeys(obj: UnknownRecord, ...keys: string[]): void {
  for (const key of keys) {
    if (obj[key] === null || obj[key] === undefined) {
      delete obj[key];
    }
  }
}

function deepMergePreserve(
  previous: UnknownRecord,
  incoming: UnknownRecord,
): UnknownRecord {
  const out: UnknownRecord = { ...previous };
  for (const [key, value] of Object.entries(incoming)) {
    const prevObj = asObject(out[key]);
    const incObj = asObject(value);
    if (prevObj && incObj) {
      out[key] = deepMergePreserve(prevObj, incObj);
    } else if (value !== undefined) {
      out[key] = value;
    }
  }
  return out;
}

function parseChainId(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = trimmed.startsWith("0x")
    ? Number.parseInt(trimmed.slice(2), 16)
    : Number.parseInt(trimmed, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function address(state: UserState | undefined): string | undefined {
  const value = firstEvm(state?.evm)?.address;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function svmAddress(state: UserState | undefined): string | undefined {
  const value = asObject(state?.svm)?.address;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function chainId(state: UserState | undefined): number | undefined {
  return parseChainId(firstEvm(state?.evm)?.chain_id);
}

function isConnected(state: UserState | undefined): boolean | undefined {
  const value = asObject(state?.connection)?.is_connected;
  return typeof value === "boolean" ? value : undefined;
}

function sameAddress(a?: string, b?: string): boolean {
  const na = typeof a === "string" ? a.toLowerCase() : undefined;
  const nb = typeof b === "string" ? b.toLowerCase() : undefined;
  return na !== undefined && na === nb;
}

export function normalizeUserState(
  userState?: UserState | null,
): UserState | undefined {
  const src = asObject(userState);
  if (!src) {
    return undefined;
  }

  const out: UserState = {};
  const connection = buildConnection(asObject(pick(src, "connection")), src);
  if (connection) out.connection = connection;
  const evm = buildEvm(firstEvm(pick(src, "evm")), src);
  if (evm) out.evm = [evm];
  const svm = buildSvm(asObject(pick(src, "svm", "solana")), src);
  if (svm) out.svm = svm;
  const pending = buildPending(asObject(pick(src, "pending")), src);
  if (pending) out.pending = pending;

  const ext = pick(src, "ext");
  if (ext !== undefined) out.ext = ext as UserState["ext"];
  const preferences = pick(src, "preferences");
  if (preferences !== undefined)
    out.preferences = preferences as UserState["preferences"];

  return out;
}

function stripDanglingConnection(state: UserState): UserState {
  if (
    isConnected(state) !== true ||
    chainId(state) !== undefined ||
    svmAddress(state) !== undefined
  ) {
    return state;
  }
  const conn = asObject(state.connection);
  if (!conn) return state;
  const trimmed = { ...conn };
  delete trimmed.is_connected;
  if (Object.keys(trimmed).length) {
    state.connection = trimmed;
  } else {
    delete state.connection;
  }
  return state;
}

export function reconcileUserState(
  previousUserState?: UserState | null,
  incomingUserState?: UserState | null,
): UserState | undefined {
  const inc = normalizeUserState(incomingUserState);
  if (!inc) return undefined;
  const prev = normalizeUserState(previousUserState);
  if (!prev) return stripDanglingConnection(inc);

  const out: UserState = { ...inc };
  const connectedNotBroken = isConnected(inc) !== false;

  const prevConn = asObject(prev.connection);
  const incConn = asObject(inc.connection);
  if (connectedNotBroken && prevConn) {
    out.connection = incConn ? deepMergePreserve(prevConn, incConn) : prevConn;
  }

  const prevEvm = firstEvm(prev.evm);
  const incEvm = firstEvm(inc.evm);
  const sameEvm =
    !!address(prev) && (!address(inc) || sameAddress(address(prev), address(inc)));
  if (connectedNotBroken && prevEvm && (sameEvm || !incEvm)) {
    out.evm = [incEvm ? deepMergePreserve(prevEvm, incEvm) : prevEvm];
  }

  const prevSvm = asObject(prev.svm);
  const incSvm = asObject(inc.svm);
  const sameSvm =
    !!svmAddress(prev) &&
    (!svmAddress(inc) || svmAddress(prev) === svmAddress(inc));
  if (connectedNotBroken && prevSvm && (sameSvm || !incSvm)) {
    out.svm = incSvm ? deepMergePreserve(prevSvm, incSvm) : prevSvm;
  }

  if (!asObject(inc.pending) && asObject(prev.pending)) {
    out.pending = prev.pending;
  }
  if (inc.ext === undefined && prev.ext !== undefined) {
    out.ext = prev.ext;
  }
  const outExt = asObject(out.ext);
  if (outExt && Object.keys(outExt).length === 0) {
    delete out.ext;
  }
  if (inc.preferences === undefined && prev.preferences !== undefined) {
    out.preferences = prev.preferences;
  }

  return stripDanglingConnection(out);
}
