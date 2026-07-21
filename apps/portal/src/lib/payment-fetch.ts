import type { x402Client } from "@x402/core/client";
import { handlePaymentChallenges, parseChainId } from "@aomi-labs/client";

function isChatPost(request: Request): boolean {
  return (
    request.method.toUpperCase() === "POST" &&
    new URL(request.url).pathname === "/api/thread/chat"
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
