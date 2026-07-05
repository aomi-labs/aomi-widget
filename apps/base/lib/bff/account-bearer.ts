import { SignJWT, importPKCS8 } from "jose";
import { nowSeconds } from "./crypto";

const ISSUER = process.env.AOMI_BFF_ISSUER ?? "aomi-bff";
const AUDIENCE = process.env.AOMI_BACKEND_AUDIENCE ?? "aomi-backend";
const KID = process.env.AOMI_BFF_KEY_ID ?? process.env.AOMI_BFF_KID;
const TTL_SECONDS = Number(
  process.env.AOMI_BFF_ACCOUNT_BEARER_TTL_SECONDS ?? "300",
);

function privateKeyPem(): string {
  const pem =
    process.env.AOMI_BFF_PRIVATE_KEY_PEM ??
    process.env.AOMI_BFF_ED25519_PRIVATE_KEY_PEM;
  if (!pem) {
    throw new Error(
      "AOMI_BFF_PRIVATE_KEY_PEM is required to mint AccountBearers",
    );
  }
  return pem.replace(/\\n/g, "\n");
}

export async function mintAccountBearer(userId: string): Promise<string> {
  if (!KID) {
    throw new Error("AOMI_BFF_KEY_ID is required to mint AccountBearers");
  }
  const now = nowSeconds();
  const key = await importPKCS8(privateKeyPem(), "EdDSA");
  return new SignJWT({ role: "user" })
    .setProtectedHeader({ alg: "EdDSA", kid: KID })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(userId)
    .setIssuedAt(now)
    .setExpirationTime(now + TTL_SECONDS)
    .sign(key);
}
