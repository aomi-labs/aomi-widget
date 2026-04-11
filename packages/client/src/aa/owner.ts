import type { Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import type { AAState } from "./types";
import type { AAProvider } from "./env";

export type AAOwner =
  | {
      kind: "direct";
      privateKey: `0x${string}`;
    }
  | {
      kind: "session";
      // Future adapters such as Privy can be added later. Only "para" is
      // implemented today.
      adapter: string;
      session: unknown;
      signer?: unknown;
      address?: Hex;
    };

type DirectOwner = Extract<AAOwner, { kind: "direct" }>;
type SessionOwner = Extract<AAOwner, { kind: "session" }>;

type SDKOwnerParams =
  | {
      para: never;
      signer: ReturnType<typeof privateKeyToAccount>;
    }
  | {
      para: never;
      signer: never;
      address?: Hex;
    }
  | {
      para: never;
      address?: Hex;
    };

type ResolvedOwnerParams =
  | { kind: "ready"; ownerParams: SDKOwnerParams }
  | { kind: "missing" }
  | { kind: "unsupported_adapter"; adapter: string };

function getDirectOwnerParams(owner: DirectOwner): ResolvedOwnerParams {
  return {
    kind: "ready",
    ownerParams: {
      para: undefined as never,
      signer: privateKeyToAccount(owner.privateKey),
    },
  };
}

function getParaSessionOwnerParams(owner: SessionOwner): ResolvedOwnerParams {
  if (owner.signer) {
    return {
      kind: "ready",
      ownerParams: {
        para: owner.session as never,
        signer: owner.signer as never,
        ...(owner.address ? { address: owner.address } : {}),
      },
    };
  }

  return {
    kind: "ready",
    ownerParams: {
      para: owner.session as never,
      ...(owner.address ? { address: owner.address } : {}),
    },
  };
}

function getSessionOwnerParams(owner: SessionOwner): ResolvedOwnerParams {
  switch (owner.adapter) {
    case "para":
      return getParaSessionOwnerParams(owner);
    default:
      return { kind: "unsupported_adapter", adapter: owner.adapter };
  }
}

export function getOwnerParams(
  owner: AAOwner | undefined,
): ResolvedOwnerParams {
  if (!owner) {
    return { kind: "missing" };
  }

  switch (owner.kind) {
    case "direct":
      return getDirectOwnerParams(owner);
    case "session":
      return getSessionOwnerParams(owner);
  }
}

export function getMissingOwnerState(
  resolved: AAState["resolved"],
  provider: AAProvider,
): AAState {
  return {
    resolved,
    account: null,
    pending: false,
    error: new Error(
      `${provider} AA account creation requires a direct owner or a supported session owner.`,
    ),
  };
}

export function getUnsupportedAdapterState(
  resolved: AAState["resolved"],
  adapter: string,
): AAState {
  return {
    resolved,
    account: null,
    pending: false,
    error: new Error(`Session adapter "${adapter}" is not implemented.`),
  };
}
