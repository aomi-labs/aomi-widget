import type { WalletEip712Payload } from "@aomi-labs/react";
import type { AomiWalletKit } from "@aomi-labs/widget-lib";
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { handlePaymentChallenges, parseChainId } from "@aomi-labs/client";
import { getAddress, isAddress } from "viem";

function isChatPost(request: Request): boolean {
  const pathname = new URL(request.url).pathname;
  return (
    request.method.toUpperCase() === "POST" && pathname === "/v1/agent/chat"
  );
}

function isMppChallenge(response: Response): boolean {
  return /^\s*Payment(?:\s|$)/i.test(
    response.headers.get("www-authenticate") ?? "",
  );
}

export function x402EvmChainId(network: string): number {
  const prefix = "eip155:";
  const chainId = network.startsWith(prefix)
    ? parseChainId(network.slice(prefix.length))
    : undefined;
  if (!chainId) {
    throw new Error(`Unsupported x402 EVM network: ${network}`);
  }
  return chainId;
}

export function createPortalX402Client(
  wallet: Pick<AomiWalletKit, "identity" | "signTypedData" | "switchChain">,
): x402Client | undefined {
  const address = wallet.identity.address;
  const signTypedData = wallet.signTypedData;
  if (!address || !isAddress(address) || !signTypedData) {
    return undefined;
  }

  const client = new x402Client();
  client.register(
    "eip155:*",
    new ExactEvmScheme({
      // NOTE: the cast is load-bearing here, not redundant: in this repo's
      // resolved viem/abitype types, `getAddress` returns `Address`, which
      // widens to `string` (abitype's `AddressType` register), so without the
      // assertion `ExactEvmScheme`'s `0x${string}` field rejects it (TS2322).
      address: getAddress(address) as `0x${string}`,
      signTypedData: async (typedData) => {
        const result = await signTypedData({
          typed_data: typedData as WalletEip712Payload["typed_data"],
        });
        return result.signature as `0x${string}`;
      },
    }),
  );
  client.onBeforePaymentCreation(async ({ selectedRequirements }) => {
    const chainId = x402EvmChainId(selectedRequirements.network);
    if (wallet.identity.chainId === chainId) return;
    if (!wallet.switchChain) {
      throw new Error(`Cannot switch the wallet to x402 chain ${chainId}`);
    }
    await wallet.switchChain(chainId);
  });
  return client;
}

export function createPortalPaymentFetch({
  fetch: rawFetch,
  mppFetch,
  x402,
}: {
  fetch: typeof globalThis.fetch;
  mppFetch?: typeof globalThis.fetch;
  x402?: x402Client;
}): typeof globalThis.fetch {
  return async (input, init) => {
    const request = new Request(input, init);
    if (!isChatPost(request)) {
      return rawFetch(request);
    }

    const response = await rawFetch(request.clone());
    if (response.status !== 402) {
      return response;
    }

    if (response.headers.has("payment-required")) {
      if (!x402) {
        return response;
      }
      return handlePaymentChallenges(request, response, rawFetch, x402);
    }

    if (mppFetch && isMppChallenge(response)) {
      return mppFetch(request);
    }

    return response;
  };
}
