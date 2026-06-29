import type { UserState } from "./index";

type UnknownRecord = Record<string, unknown>;

function asObject(value: unknown): UnknownRecord | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as UnknownRecord;
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

function assignDefined(
  target: UnknownRecord,
  key: string,
  value: unknown,
): void {
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
): UnknownRecord | undefined {
  const c: UnknownRecord = { ...(src ?? {}) };
  renameKey(c, "isConnected", "is_connected");
  renameKey(c, "providerLabel", "provider_label");
  renameKey(c, "walletProviderSubject", "wallet_provider_subject");
  renameKey(c, "authMethod", "auth_method");
  renameKey(c, "authValue", "auth_value");
  renameKey(c, "authVerifiedAt", "auth_verified_at");
  // `connection.is_connected` is a non-`Option` `bool` on the backend; an
  // explicit `null` fails serde with a 400. Drop it (defaults to false).
  dropNullKeys(c, "is_connected");
  return Object.keys(c).length ? c : undefined;
}

function buildEvm(src: UnknownRecord | undefined): UnknownRecord | undefined {
  const e: UnknownRecord = { ...(src ?? {}) };
  renameKey(e, "chainId", "chain_id");
  renameKey(e, "ensName", "ens_name");

  const aa: UnknownRecord = { ...(asObject(e.aa) ?? {}) };
  delete e.aa;
  renameKey(aa, "smartAccount", "smart_account");
  renameKey(aa, "delegation7702", "delegation_7702");
  if (Object.keys(aa).length) e.aa = aa;

  const sponsorship: UnknownRecord = { ...(asObject(e.sponsorship) ?? {}) };
  delete e.sponsorship;
  renameKey(sponsorship, "sponsorProvider", "sponsor_provider");
  renameKey(sponsorship, "sponsorAccount", "sponsor_account");
  if (Object.keys(sponsorship).length) e.sponsorship = sponsorship;

  if (e.chain_id != null) {
    const cid = parseChainId(e.chain_id);
    if (cid !== undefined) e.chain_id = cid;
    else delete e.chain_id;
  }
  return Object.keys(e).length ? e : undefined;
}

/**
 * Normalize `evm` to its canonical array shape (one entry per chain). A bare
 * single object is tolerated and folded into a one-element array; each element
 * is canonicalized (camelCase→snake_case) by [`buildEvm`].
 */
function buildEvmArray(srcEvm: unknown): UnknownRecord[] {
  if (Array.isArray(srcEvm)) {
    return srcEvm
      .map((element) => buildEvm(asObject(element)))
      .filter((element): element is UnknownRecord => element !== undefined);
  }
  const single = buildEvm(asObject(srcEvm));
  return single ? [single] : [];
}

/**
 * Merge key for an EVM wallet. Keyed by address (case-insensitive) so a
 * chain-agnostic entry and a later chain-refined entry for the SAME address
 * collapse into one (the chain_id refines the wallet, it doesn't fork it).
 * Distinct addresses stay distinct entries (the multi-chain-different-address
 * case). Address-less entries fall back to chain id.
 */
function evmMergeKey(wallet: UnknownRecord): string {
  const addr = wallet.address;
  if (typeof addr === "string" && addr.length > 0) {
    return `addr:${addr.toLowerCase()}`;
  }
  const cid = parseChainId(wallet.chain_id);
  return cid === undefined ? "__default__" : `chain:${cid}`;
}

/** Merge two EVM wallet arrays by wallet, preserving prior per-wallet detail. */
function mergeEvmArrays(
  previous: UnknownRecord[],
  incoming: UnknownRecord[],
): UnknownRecord[] {
  const prevByKey = new Map<string, UnknownRecord>();
  for (const wallet of previous) prevByKey.set(evmMergeKey(wallet), wallet);

  const out: UnknownRecord[] = [];
  const seen = new Set<string>();
  for (const wallet of incoming) {
    const key = evmMergeKey(wallet);
    seen.add(key);
    const prior = prevByKey.get(key);
    out.push(prior ? deepMergePreserve(prior, wallet) : wallet);
  }
  for (const [key, wallet] of prevByKey) {
    if (!seen.has(key)) out.push(wallet);
  }
  return out;
}

/** The primary (first) EVM wallet — the default operating wallet. */
function primaryEvm(state: UserState | undefined): UnknownRecord | undefined {
  const evm = state?.evm;
  if (Array.isArray(evm)) return asObject(evm[0]);
  return asObject(evm);
}

function buildSvm(src: UnknownRecord | undefined): UnknownRecord | undefined {
  const s: UnknownRecord = { ...(src ?? {}) };
  renameKey(s, "walletName", "wallet_name");
  // `svm.capabilities` is a non-`Option` `Vec` on the backend; an explicit
  // `null` fails serde with a 400 (the staging chat-portal regression). Drop it
  // when null/undefined — absence defaults to an empty capability set.
  dropNullKeys(s, "capabilities");
  return Object.keys(s).length ? s : undefined;
}

function buildPending(
  src: UnknownRecord | undefined,
): UnknownRecord | undefined {
  const p: UnknownRecord = {};
  assignDefined(p, "evm_txs", snakeizeBucket(pick(src, "evm_txs", "evmTxs")));
  assignDefined(p, "evm_sigs", snakeizeBucket(pick(src, "evm_sigs", "evmSigs")));
  assignDefined(
    p,
    "svm_ixs",
    snakeizeBucket(pick(src, "svm_ixs", "svmIxs", "solana_txs", "solanaTxs")),
  );
  assignDefined(
    p,
    "svm_sigs",
    snakeizeBucket(
      pick(src, "svm_sigs", "svmSigs", "solana_sigs", "solanaSigs"),
    ),
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
  const value = primaryEvm(state)?.address;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function svmAddress(state: UserState | undefined): string | undefined {
  const value = asObject(state?.svm)?.address;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function chainId(state: UserState | undefined): number | undefined {
  return parseChainId(primaryEvm(state)?.chain_id);
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
  const connection = buildConnection(asObject(pick(src, "connection")));
  if (connection) out.connection = connection;
  const evm = buildEvmArray(pick(src, "evm"));
  if (evm.length) out.evm = evm;
  const svm = buildSvm(asObject(pick(src, "svm", "solana")));
  if (svm) out.svm = svm;
  const pending = buildPending(asObject(pick(src, "pending")));
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

  const prevEvm = Array.isArray(prev.evm) ? prev.evm : [];
  const incEvm = Array.isArray(inc.evm) ? inc.evm : [];
  const sameEvm =
    !!address(prev) &&
    (!address(inc) || sameAddress(address(prev), address(inc)));
  if (connectedNotBroken && prevEvm.length && (sameEvm || !incEvm.length)) {
    out.evm = incEvm.length ? mergeEvmArrays(prevEvm, incEvm) : prevEvm;
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
