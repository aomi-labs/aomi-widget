import type { x402Client, x402HTTPClient } from "@x402/core/client";
import { wrapFetchWithPayment } from "@x402/fetch";

const MAX_PAYMENT_CHALLENGES = 4;

function paymentResponseHeader(response: Response): string | null {
  return (
    response.headers.get("payment-response") ??
    response.headers.get("x-payment-response")
  );
}

function withInitialResponse(
  initialResponse: Response,
  fetchImpl: typeof globalThis.fetch,
): typeof globalThis.fetch {
  let pendingResponse: Response | undefined = initialResponse;

  return (input, init) => {
    if (pendingResponse) {
      const response = pendingResponse;
      pendingResponse = undefined;
      return Promise.resolve(response);
    }
    return fetchImpl(input, init);
  };
}

/**
 * Pays an x402 challenge and follows a new challenge only when the preceding
 * signed response includes a settlement receipt.
 */
export async function handlePaymentChallenges(
  request: Request,
  initialResponse: Response,
  fetchImpl: typeof globalThis.fetch,
  client: x402Client | x402HTTPClient,
): Promise<Response> {
  let response = initialResponse;
  let attempts = 0;

  while (response.status === 402) {
    if (attempts > 0 && paymentResponseHeader(response) === null) {
      return response;
    }
    if (attempts === MAX_PAYMENT_CHALLENGES) {
      throw new Error(
        `Exceeded ${MAX_PAYMENT_CHALLENGES} sequential x402 payment challenges`,
      );
    }

    response = await wrapFetchWithPayment(
      withInitialResponse(response, fetchImpl),
      client,
    )(request.clone());
    attempts += 1;
  }

  return response;
}

/** Adds bounded sequential x402 settlement to a fetch implementation. */
export function wrapFetchWithPaymentChallenges(
  fetchImpl: typeof globalThis.fetch,
  client: x402Client | x402HTTPClient,
): typeof globalThis.fetch {
  return async (input, init) => {
    const request = new Request(input, init);
    const response = await fetchImpl(request.clone());
    return handlePaymentChallenges(request, response, fetchImpl, client);
  };
}
