import { createHash, randomBytes } from "node:crypto";
import { requireWidgetOrigin, widgetOriginDomain } from "./origin";
import { widgetAuthStore, type WidgetAuthStore, type WidgetAuthTicket } from "./store";

/** The wire challenge returned to the client for both SIWE and SIWS. The two
 * families produce structurally identical challenges; only the stored ticket
 * (address type, chain-id type, kind) differs. */
export type WidgetChallenge = {
  nonce: string;
  domain: string;
  uri: string;
  issuedAt: string;
  expirationTime: string;
};

/** Boilerplate shared by `createWidgetSiweChallenge` and
 * `createWidgetSiwsChallenge`: require the widget origin, mint a nonce, persist
 * the family-specific ticket keyed by `namespace`, and return the wire
 * challenge. `buildTicket` validates the address/chain-id and shapes the ticket
 * so the family-specific validation keeps its exact error behavior. */
export async function createWidgetChallenge(input: {
  request: Request;
  namespace: string;
  ttlSeconds: number;
  buildTicket: (ctx: {
    origin: string;
    issuedAt: string;
    expiresAt: string;
  }) => WidgetAuthTicket;
  now?: Date;
  store?: WidgetAuthStore;
}): Promise<WidgetChallenge> {
  const origin = requireWidgetOrigin(input.request);
  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + input.ttlSeconds * 1000);
  const nonce = randomBytes(32).toString("hex");
  const ticket = input.buildTicket({
    origin,
    issuedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });
  await (input.store ?? widgetAuthStore).write({
    identifier: challengeIdentifier(input.namespace, nonce),
    expiresAt,
    ticket,
  });
  return {
    nonce,
    domain: widgetOriginDomain(origin),
    uri: origin,
    issuedAt: now.toISOString(),
    expirationTime: expiresAt.toISOString(),
  };
}

export function challengeIdentifier(namespace: string, nonce: string): string {
  return `${namespace}${createHash("sha256").update(nonce).digest("hex")}`;
}
