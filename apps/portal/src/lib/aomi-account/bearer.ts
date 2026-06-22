import { importPKCS8, SignJWT } from "jose";

/**
 * Mints the **AccountBearer** the Rust backend verifies — the only carrier of
 * account identity into the backend. Convention must match the `aomi-service`
 * verifier (docs/topics/account-authentication/facts/service-identity.md):
 * EdDSA, header `kid`, claims `sub`/`iss`/`aud`/`role`/`iat`/`exp`.
 *
 * `sub` is our **canonical user id** (a `users.id` UUID), never a provider DID.
 * The private key is a secret in env; only its public half lives in the
 * backend's `service.toml`. Node runtime only.
 */
export const ISSUER = "aomi-bff";
export const AUDIENCE = "aomi-backend";
export const ACCOUNT_BEARER_TTL_SECONDS = 15 * 60;

export type MintedBearer = {
  accessToken: string;
  /** Expiry, unix seconds — matches the `exp` claim. */
  expiresAt: number;
};

type SigningKey = { privateKey: Awaited<ReturnType<typeof importPKCS8>>; kid: string };
let cachedSigningKey: SigningKey | null = null;

async function signingKey(): Promise<SigningKey> {
  if (cachedSigningKey) return cachedSigningKey;
  const pem = process.env.PORTAL_ACCOUNT_BEARER_PRIVATE_KEY?.replaceAll("\\n", "\n").trim();
  const kid = process.env.PORTAL_ACCOUNT_BEARER_KID?.trim();
  if (!pem || !kid) {
    throw new Error("Account bearer signing is not configured");
  }
  cachedSigningKey = { privateKey: await importPKCS8(pem, "EdDSA"), kid };
  return cachedSigningKey;
}

/**
 * Sign an AccountBearer for a resolved canonical user. `role` defaults to
 * `user`; the backend authorizes it against the issuer's configured `roles`.
 */
export async function mintAccountBearer(
  canonicalUserId: string,
  role: string = "user",
): Promise<MintedBearer> {
  const { privateKey, kid } = await signingKey();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + ACCOUNT_BEARER_TTL_SECONDS;
  const accessToken = await new SignJWT({ role })
    .setProtectedHeader({ alg: "EdDSA", kid })
    .setSubject(canonicalUserId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(expiresAt)
    .sign(privateKey);
  return { accessToken, expiresAt };
}
