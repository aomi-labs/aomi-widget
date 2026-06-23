import { portalService } from "./topology";

/**
 * Mints the **AccountBearer** the Rust backend verifies — the only carrier of
 * account identity into the backend. Convention must match the `aomi-service`
 * verifier (docs/topics/account-authentication/facts/service-identity.md):
 * EdDSA, header `kid`, claims `sub`/`iss`/`aud`/`role`/`iat`/`exp`.
 *
 * `sub` is our **canonical user id** (a `users.id` UUID), never a provider DID.
 * Signing now goes through the portal's `AomiService` ([./topology](./topology.ts)):
 * it holds the private key (env) and takes `iss`/`kid`/allowed-roles/audience
 * from the committed `service.portal.toml`. Node runtime only.
 */
export const AUDIENCE = "aomi-backend";
export const ACCOUNT_BEARER_TTL_SECONDS = 15 * 60;

export type MintedBearer = {
  /** The signed EdDSA JWT — used as the `Authorization: Bearer` AccountBearer. */
  accessToken: string;
  /** Expiry, unix seconds — matches the `exp` claim. */
  expiresAt: number;
};

/**
 * Sign an AccountBearer for a resolved canonical user. `role` defaults to
 * `user`; the topology authorizes it against `aomi-bff`'s configured roles.
 */
export async function mintAccountBearer(
  canonicalUserId: string,
  role: string = "user",
): Promise<MintedBearer> {
  return portalService().mint({
    role,
    subject: canonicalUserId,
    audience: AUDIENCE,
    ttlSeconds: ACCOUNT_BEARER_TTL_SECONDS,
  });
}
