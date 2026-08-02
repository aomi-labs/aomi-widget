import type { AomiClient } from "./client";

export type AuthorizationPoster = <T>(
  path: string,
  body: unknown,
) => Promise<T>;

export type AomiAuthorizationPermit = {
  account: string;
  chain_type: string;
  wallet: string;
  mode: string;
  version: number;
  expiry: number;
};

export type AomiAuthorizationChallenge = {
  permit: AomiAuthorizationPermit;
  typed_data?: unknown;
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

export function posterFromClient(client: AomiClient): AuthorizationPoster {
  return (path, body) => client.request("POST", path, { body, raw: true });
}

export function authorizationChallenge(
  post: AuthorizationPoster,
  request: { chain_type: string; wallet: string; mode: string },
): Promise<AomiAuthorizationChallenge> {
  return post("/api/account/authorization/challenge", request);
}

export function authorizationCommit(
  post: AuthorizationPoster,
  request: {
    permit: AomiAuthorizationPermit;
    signature: string;
    signer?: string;
  },
): Promise<AomiAuthorizationState> {
  return post("/api/account/authorization/commit", request);
}

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
    if (isAlreadyBound(error)) return { status: "already_bound" };
    throw error;
  }

  if (!challenge.message_base64) {
    throw new Error("bind challenge returned no svm message payload");
  }

  const signature = await signMessage(base64ToBytes(challenge.message_base64));
  try {
    return {
      status: "bound",
      state: await authorizationCommit(post, {
        permit: challenge.permit,
        signature: bytesToBase64(signature),
      }),
    };
  } catch (error) {
    if (isAlreadyBound(error)) return { status: "already_bound" };
    throw error;
  }
}

export function ensureSvmWalletBound(
  client: AomiClient,
  wallet: string,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
): Promise<AomiEnsureBoundResult> {
  return ensureSvmWalletBoundVia(posterFromClient(client), wallet, signMessage);
}

export function isUnboundWalletError(error: unknown): boolean {
  const text =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  return text.includes("signing_unbound_wallet");
}

function isAlreadyBound(error: unknown): boolean {
  return error instanceof Error && error.message.includes("already_bound");
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
