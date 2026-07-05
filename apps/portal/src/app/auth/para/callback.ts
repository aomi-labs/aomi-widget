// Pure helpers for the Para connect callback: payload assembly, the POST
// retry loop, and the JWT-claims decode used by the success banner. Kept free
// of React/SDK imports so they are unit-testable (see callback.test.ts).

/// One fresh attestation of the live Para session, produced immediately
/// before each POST attempt — never cached across attempts.
export type ParaAttestation = {
  /** Para session JWT from `issueJwt()`. */
  paraJwt: string;
  /** Para user id read off the live client after the JWT was issued. */
  userId: string;
  /** `keyId` returned alongside the JWT (the signing key's `kid`). */
  keyId?: string;
  /** One-shot token from `getVerificationToken()` for the backend's
   * optional live-session check. */
  verificationToken?: string;
};

export type ParaCallbackResult =
  | { ok: true; paraJwt: string; keyId?: string }
  | { ok: false; status: number; detail: string };

const DEFAULT_RETRY_DELAYS_MS = [0, 400, 1200];

/// Exact JSON body of `POST {backend}/api/auth/para/callback`
/// (crates/sign/src/para/callback.rs `ParaCallbackRequest`). Blank optionals
/// are omitted — the backend folds them to None anyway.
export function buildParaCallbackBody(
  state: string,
  attestation: ParaAttestation,
): Record<string, string> {
  const body: Record<string, string> = {
    state,
    para_jwt: attestation.paraJwt,
    user_id: attestation.userId,
  };
  if (attestation.keyId?.trim()) {
    body.key_id = attestation.keyId;
  }
  if (attestation.verificationToken?.trim()) {
    body.verification_token = attestation.verificationToken;
  }
  return body;
}

/// POST the callback, minting a fresh attestation per attempt via `attest`
/// so a retry never replays a stale JWT or one-shot verification token.
/// Retries 5xx (backend Upstream/Config/Other); terminal on 4xx — those are
/// deterministic verification rejections. Errors thrown by `attest` or
/// `fetchFn` propagate to the caller.
export async function postParaCallback({
  state,
  callbackUrl,
  attest,
  fetchFn = fetch,
  retryDelaysMs = DEFAULT_RETRY_DELAYS_MS,
  sleepFn = sleep,
}: {
  state: string;
  callbackUrl?: string;
  attest: () => Promise<ParaAttestation>;
  fetchFn?: (input: string, init: RequestInit) => Promise<Response>;
  retryDelaysMs?: number[];
  sleepFn?: (ms: number) => Promise<void>;
}): Promise<ParaCallbackResult> {
  if (!callbackUrl) {
    return { ok: false, status: 0, detail: "Missing backend callback URL." };
  }

  for (let attempt = 0; attempt < retryDelaysMs.length; attempt++) {
    const delayMs = retryDelaysMs[attempt];
    if (delayMs > 0) {
      await sleepFn(delayMs);
    }

    const attestation = await attest();
    const res = await fetchFn(callbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildParaCallbackBody(state, attestation)),
    });
    if (res.ok) {
      // keyId rides along so the follow-up portal-session exchange can reuse
      // the exact attestation the backend just accepted.
      return {
        ok: true,
        paraJwt: attestation.paraJwt,
        keyId: attestation.keyId,
      };
    }

    const detail = await res.text().catch(() => "");
    const shouldRetry = attempt < retryDelaysMs.length - 1 && res.status >= 500;
    if (!shouldRetry) {
      return { ok: false, status: res.status, detail };
    }
  }

  return { ok: false, status: 0, detail: "Callback retry budget exhausted." };
}

export type ParaConnectOutcome =
  | { ok: true; paraJwt: string; keyId?: string }
  | { ok: false; stage: "wallet" | "callback"; status: number; detail: string };

/// The connect pipeline: guarantee the embedded wallet exists, then attest
/// and POST. The ordering is the contract — a JWT issued before the wallet
/// is provisioned would not attest it (Para stamps `data.wallets` at issue
/// time), and a wallet failure is terminal without ever reaching the
/// backend, whose POST would be doomed to 400 "no wallets".
export async function runParaConnect({
  state,
  callbackUrl,
  ensureWallet,
  attest,
  fetchFn,
  retryDelaysMs,
  sleepFn,
}: {
  state: string;
  callbackUrl?: string;
  /** `ensureEmbeddedWallet` (ensure-wallet.ts): null on success, else a
   * user-facing error message. */
  ensureWallet: () => Promise<string | null>;
  attest: () => Promise<ParaAttestation>;
  fetchFn?: (input: string, init: RequestInit) => Promise<Response>;
  retryDelaysMs?: number[];
  sleepFn?: (ms: number) => Promise<void>;
}): Promise<ParaConnectOutcome> {
  const walletError = await ensureWallet();
  if (walletError !== null) {
    return { ok: false, stage: "wallet", status: 0, detail: walletError };
  }
  const result = await postParaCallback({
    state,
    callbackUrl,
    attest,
    fetchFn,
    retryDelaysMs,
    sleepFn,
  });
  return result.ok ? result : { ...result, stage: "callback" };
}

// The backend replies with a plain-text message on failure
// (bin/backend endpoint/privy_oauth.rs `callback_sign_error`).
export function formatCallbackFailure(callback: {
  status: number;
  detail: string;
}): string {
  const detail = callback.detail.trim().slice(0, 240);
  return detail
    ? `Callback failed: ${callback.status} ${detail}`
    : `Callback failed: ${callback.status}`;
}

export type ParaExchangeResult =
  | { ok: true }
  | { ok: false; status: number; detail: string };

/// Establish the portal's own session from the attestation the backend just
/// accepted: `POST /api/bff/auth/exchange` verifies the Para JWT against
/// Para's JWKS, resolves-or-creates the canonical user, and sets the
/// `aomi_session` cookie. Without this the chat stays anonymous and on-chain
/// commits fail with "thread is not bound to a user". Runs strictly AFTER the
/// backend connect — the callback is the authoritative writer of the identity
/// graph (`auth_providers` + `public_keys`), so the exchange's
/// `(para, sub)` lookup lands on that user instead of minting a parallel one.
export async function postSessionExchange({
  paraJwt,
  keyId,
  address,
  exchangeUrl = "/api/bff/auth/exchange",
  fetchFn = fetch,
}: {
  /** The same fresh `issueJwt` token the successful callback POSTed. */
  paraJwt: string;
  keyId?: string;
  /** Connected EVM wallet address — the exchange's TMP wallet-first bridge. */
  address?: string;
  exchangeUrl?: string;
  fetchFn?: (input: string, init: RequestInit) => Promise<Response>;
}): Promise<ParaExchangeResult> {
  const body: Record<string, string> = { provider: "para", jwt: paraJwt };
  if (keyId?.trim()) {
    body.key_id = keyId;
  }
  if (address?.trim()) {
    body.address = address;
  }
  const res = await fetchFn(exchangeUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.ok) {
    return { ok: true };
  }
  const detail = await res.text().catch(() => "");
  return { ok: false, status: res.status, detail };
}

// The exchange route replies with JSON `{ error }` on failure.
export function formatExchangeFailure(exchange: {
  status: number;
  detail: string;
}): string {
  let detail = exchange.detail.trim();
  try {
    const parsed = JSON.parse(detail) as { error?: unknown };
    if (typeof parsed.error === "string") {
      detail = parsed.error;
    }
  } catch {
    // Not JSON — keep the raw body.
  }
  detail = detail.slice(0, 240);
  return detail
    ? `Aomi session setup failed: ${exchange.status} ${detail}`
    : `Aomi session setup failed: ${exchange.status}`;
}

export type AttestedWallet = {
  id: string;
  address: string;
  family: "evm" | "solana";
};

/// Display-only decode of the Para JWT we just POSTed: `data.wallets` claims
/// per <https://docs.getpara.com/v2/react/guides/sessions-jwt>. No signature
/// check — the backend verifies against Para's JWKS; this only feeds the
/// success banner. Returns [] on anything malformed.
export function decodeParaJwtWallets(token: string): AttestedWallet[] {
  try {
    const payload = token.split(".")[1] ?? "";
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(
      atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")),
    ) as {
      data?: {
        wallets?: Array<{ id?: string; type?: string; address?: string }>;
      };
    };

    const wallets: AttestedWallet[] = [];
    for (const wallet of claims.data?.wallets ?? []) {
      const family =
        wallet.type === "EVM"
          ? ("evm" as const)
          : wallet.type === "SOLANA"
            ? ("solana" as const)
            : null;
      if (!family || !wallet.address) continue;
      wallets.push({ id: wallet.id ?? "", address: wallet.address, family });
    }
    return wallets;
  } catch {
    return [];
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
