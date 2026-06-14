"use client";

import type { AAOwner } from "@aomi-labs/client";
import type { Hex } from "viem";

export type AomiAAOwnerInput =
  | {
      kind: "provider-session";
      provider: "para" | "privy";
      session: unknown;
      signer?: unknown;
      address?: Hex;
    }
  | {
      kind: "external-wallet";
      walletClient: unknown;
      address: Hex;
    }
  | {
      kind: "direct";
      privateKey: `0x${string}`;
    };

export function toClientAAOwner(owner: AomiAAOwnerInput): AAOwner {
  switch (owner.kind) {
    case "provider-session":
      return {
        kind: "session",
        adapter: owner.provider,
        session: owner.session,
        signer: owner.signer,
        address: owner.address,
      };
    case "direct":
      return {
        kind: "direct",
        privateKey: owner.privateKey,
      };
    case "external-wallet":
      return {
        kind: "external-wallet",
        signer: owner.walletClient,
        address: owner.address,
      };
  }
}
