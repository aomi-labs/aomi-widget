import type { Hex } from "viem";
import type { WalletAaSignPayload } from "@aomi-labs/react";

export interface WalletOwnerSigner {
  getOwner(): Promise<{ address: `0x${string}`; chainId: number }>;
  signPersonalMessages(
    requests: readonly { message: `0x${string}` }[],
  ): Promise<readonly `0x${string}`[]>;
}

type WalletClientLike = {
  signMessage?: (args: unknown) => Promise<Hex>;
};

// Browser EOAs and Para embedded EOAs both sign through the same wagmi wallet
// client, so a single signer covers both.
export class WagmiOwnerSigner implements WalletOwnerSigner {
  constructor(
    private readonly owner: { address: `0x${string}`; chainId: number },
    private readonly getWalletClient: () => Promise<WalletClientLike | null>,
  ) {}

  async getOwner() {
    return this.owner;
  }

  async signPersonalMessages(
    requests: readonly { message: Hex }[],
  ): Promise<readonly Hex[]> {
    const client = await this.getWalletClient();
    if (!client?.signMessage) {
      throw new Error("The active wallet cannot sign the AA UserOperation");
    }
    const signatures: Hex[] = [];
    for (const request of requests) {
      signatures.push(
        await client.signMessage({
          account: this.owner.address,
          message: { raw: request.message },
        }),
      );
    }
    return signatures;
  }
}

export class PrivyOwnerSigner implements WalletOwnerSigner {
  constructor(
    private readonly owner: { address: `0x${string}`; chainId: number },
    private readonly sign: (message: Hex, owner: `0x${string}`) => Promise<Hex>,
  ) {}

  async getOwner() {
    return this.owner;
  }

  async signPersonalMessages(
    requests: readonly { message: Hex }[],
  ): Promise<readonly Hex[]> {
    const signatures: Hex[] = [];
    for (const request of requests) {
      signatures.push(await this.sign(request.message, this.owner.address));
    }
    return signatures;
  }
}

export async function signBackendAaRequest(
  signer: WalletOwnerSigner,
  payload: WalletAaSignPayload,
): Promise<{ signatures: `0x${string}`[] }> {
  const active = await signer.getOwner();
  if (active.address.toLowerCase() !== payload.owner.toLowerCase()) {
    throw new Error("The active wallet is not the prepared AA owner");
  }
  if (active.chainId !== payload.chainId) {
    throw new Error(
      "The active chain does not match the prepared AA operation",
    );
  }
  return {
    signatures: [
      ...(await signer.signPersonalMessages(payload.signatureRequests)),
    ],
  };
}
