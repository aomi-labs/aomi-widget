/**
 * Signing-authorization ceremony client (challenge → wallet sign → commit).
 *
 * The kernel gate fails closed on wallets with no `public_keys` row
 * (`signing_unbound_wallet`). Login/OAuth paths write rows; a
 * client-connected wallet binds one here: a `"bind"` challenge, the wallet's
 * own signature over the returned payload, and a once-only commit. The same
 * endpoints also drive signing-mode changes (`"autonomous"`, `"human_sync"`,
 * `"denied"`), gated by the direction-asymmetric signer rules server-side.
 *
 * Both endpoints are `[account]`-authed. The ceremony is transport-agnostic:
 * it posts through an injected {@link AuthorizationPoster}, so an SDK caller
 * uses {@link posterFromClient} (account bearer on the client's fetch wrapper)
 * and the portal passes its own same-origin `accountScopedFetch` poster (the
 * proxy injects the bearer from the session cookie). One orchestration, two
 * hosts.
 */

import type { AomiClient } from "./client";

/** Posts a JSON body to an `[account]`-authed path and parses the response.
 * Must reject on non-2xx with an Error whose message carries the body (the
 * ceremony reads `already_bound` out of it). */
export type AuthorizationPoster = <T>(path: string, body: unknown) => Promise<T>;

/** Bridge an {@link AomiClient} into an {@link AuthorizationPoster}. */
export function posterFromClient(client: AomiClient): AuthorizationPoster {
  return (path, body) => client.request("POST", path, { body, raw: true });
}

export type AomiAuthorizationPermit = {
  account: string;
  chain_type: string;
  wallet: string;
  /** A signing mode, or `"bind"`. */
  mode: string;
  version: number;
  expiry: number;
};

export type AomiAuthorizationChallenge = {
  permit: AomiAuthorizationPermit;
  /** EVM only: wagmi-ready EIP-712 typed data. */
  typed_data?: unknown;
  /** SVM only: base64 of the exact bytes for Wallet Standard `signMessage`. */
  message_base64?: string;
};

export type AomiAuthorizationState = {
  address: string;
  chain_type: string;
  signing_mode: string;
  authorization_version: number;
};

export type AomiEnsureBoundResult =
  | { status: "bound"; state: AomiAuthorizationState }
  | { status: "already_bound" };

export async function authorizationChallenge(
  post: AuthorizationPoster,
  request: { chain_type: string; wallet: string; mode: string },
): Promise<AomiAuthorizationChallenge> {
  return post("/api/account/authorization/challenge", request);
}

export async function authorizationCommit(
  post: AuthorizationPoster,
  request: {
    permit: AomiAuthorizationPermit;
    /** EVM: hex `r‖s‖v`. SVM: base64 Ed25519 over the canonical message. */
    signature: string;
    /** SVM tighten only: base58 address of the account-linked signer. */
    signer?: string;
  },
): Promise<AomiAuthorizationState> {
  return post("/api/account/authorization/commit", request);
}

/**
 * Ensure a client-connected Solana wallet has a kernel key row, posting
 * through any {@link AuthorizationPoster}. Resolves without signing when a
 * row already exists (this account's or anyone's — first bind wins);
 * otherwise runs the possession-proof loop with the wallet's `signMessage`.
 */
export async function ensureSvmWalletBoundVia(
  post: AuthorizationPoster,
  wallet: string,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
): Promise<AomiEnsureBoundResult> {
  let challenge: AomiAuthorizationChallenge;
  try {
    challenge = await authorizationChallenge(post, {
      chain_type: "svm",
      wallet,
      mode: "bind",
    });
  } catch (error) {
    if (isAlreadyBound(error)) {
      return { status: "already_bound" };
    }
    throw error;
  }

  const message = challenge.message_base64;
  if (!message) {
    throw new Error("bind challenge returned no svm message payload");
  }
  const signature = await signMessage(base64ToBytes(message));

  try {
    const state = await authorizationCommit(post, {
      permit: challenge.permit,
      signature: bytesToBase64(signature),
    });
    return { status: "bound", state };
  } catch (error) {
    // A concurrent bind (another tab, the CLI) landing first is success by
    // this function's contract: the wallet has a row.
    if (isAlreadyBound(error)) {
      return { status: "already_bound" };
    }
    throw error;
  }
}

/** {@link ensureSvmWalletBoundVia} over an {@link AomiClient}'s account-bearer
 * fetch — the SDK-side convenience. */
export async function ensureSvmWalletBound(
  client: AomiClient,
  wallet: string,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
): Promise<AomiEnsureBoundResult> {
  return ensureSvmWalletBoundVia(posterFromClient(client), wallet, signMessage);
}

/** The backend signals a bound target as HTTP 409 `{"error":"already_bound"}`. */
function isAlreadyBound(error: unknown): boolean {
  return error instanceof Error && error.message.includes("already_bound");
}

/**
 * The kernel gate's "no `public_keys` row" signal
 * (`err.type=signing_unbound_wallet`), surfaced when a client-connected
 * wallet tries to sign before binding. This is the trigger for the
 * contextual "bind now" prompt (row 52a option b): detect it on a failed
 * commit, then run {@link ensureSvmWalletBoundVia} — the same ceremony the
 * settings action uses — and retry.
 */
export function isUnboundWalletError(error: unknown): boolean {
  const text =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return text.includes("signing_unbound_wallet");
}

function base64ToBytes(value: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64"));
  }
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  return btoa(String.fromCharCode(...bytes));
}
