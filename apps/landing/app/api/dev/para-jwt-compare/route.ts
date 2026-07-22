import { verifyParaJwt } from "@aomi-labs/account/providers";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BETA_JWKS_URL = "https://api.beta.getpara.com/.well-known/jwks.json";

const requestSchema = z.object({
  tokens: z
    .array(
      z.object({
        label: z.string().min(1).max(80),
        token: z.string().min(1).max(32_000),
        keyId: z.string().min(1).max(256).optional(),
      }),
    )
    .min(1)
    .max(2),
});

type SelectedWallet = {
  id: string | null;
  type: string | null;
  address: string | null;
};

type SelectedClaims = {
  label: string;
  audience: string;
  subject: string;
  dataUserId: string | null;
  authType: string | null;
  identifierKind: string | null;
  issuedAt: number | null;
  expiresAt: number;
  wallets: SelectedWallet[];
  connectedWallets: SelectedWallet[];
};

export async function POST(request: Request): Promise<Response> {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return noStoreJson({ error: "invalid_request" }, 400);
  }

  try {
    const claims = await Promise.all(
      parsed.data.tokens.map(async ({ keyId, label, token }) => {
        const unverified = decodePayload(token);
        const audience = singleAudience(unverified.aud);
        const verified = await verifyParaJwt({
          token,
          expectedAudience: audience,
          jwksUrl: BETA_JWKS_URL,
          keyId,
        });
        return selectClaims(label, verified.rawClaims, verified.expiresAt);
      }),
    );

    return noStoreJson({
      claims,
      comparison:
        claims.length === 2 ? compareClaims(claims[0], claims[1]) : null,
    });
  } catch (error) {
    return noStoreJson(
      {
        error: "verification_failed",
        message: error instanceof Error ? error.message : String(error),
      },
      401,
    );
  }
}

function decodePayload(token: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[1]) throw new Error("JWT shape is invalid");
  const value: unknown = JSON.parse(
    Buffer.from(parts[1], "base64url").toString("utf8"),
  );
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("JWT payload is invalid");
  }
  return value as Record<string, unknown>;
}

function singleAudience(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("JWT aud must be one non-empty string");
  }
  return value;
}

function selectClaims(
  label: string,
  claims: Record<string, unknown>,
  expiresAt: number,
): SelectedClaims {
  const data = objectValue(claims.data);
  return {
    label,
    audience: singleAudience(claims.aud),
    subject: stringValue(claims.sub) ?? "",
    dataUserId: stringValue(data?.userId),
    authType: stringValue(data?.authType),
    identifierKind: identifierKind(data),
    issuedAt: numberValue(claims.iat),
    expiresAt,
    wallets: walletRows(data?.wallets),
    connectedWallets: walletRows(
      data?.connectedWallets ?? data?.connected_wallets,
    ),
  };
}

function compareClaims(left: SelectedClaims, right: SelectedClaims) {
  const leftWallets = walletAddressSet(left.wallets);
  const rightWallets = walletAddressSet(right.wallets);
  const leftConnected = walletAddressSet(left.connectedWallets);
  const rightConnected = walletAddressSet(right.connectedWallets);
  return {
    audiencesDiffer: left.audience !== right.audience,
    sameSubject: left.subject === right.subject,
    sameDataUserId:
      Boolean(left.dataUserId) && left.dataUserId === right.dataUserId,
    sharedWalletAddresses: intersection(leftWallets, rightWallets),
    sharedConnectedWalletAddresses: intersection(leftConnected, rightConnected),
  };
}

function walletRows(value: unknown): SelectedWallet[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (row): row is Record<string, unknown> =>
        Boolean(row) && typeof row === "object" && !Array.isArray(row),
    )
    .map((row) => ({
      id: stringValue(row.id),
      type: stringValue(row.type),
      address: stringValue(row.address),
    }));
}

function walletAddressSet(wallets: SelectedWallet[]): Set<string> {
  return new Set(
    wallets
      .map((wallet) => wallet.address?.trim())
      .filter((address): address is string => Boolean(address))
      .map((address) =>
        address.startsWith("0x") ? address.toLowerCase() : address,
      ),
  );
}

function intersection(left: Set<string>, right: Set<string>): string[] {
  return [...left].filter((value) => right.has(value)).sort();
}

function identifierKind(data: Record<string, unknown> | null): string | null {
  if (!data) return null;
  if (stringValue(data.email)) return "email";
  if (stringValue(data.phone)) return "phone";
  if (stringValue(data.telegramUserId)) return "telegram";
  if (stringValue(data.farcasterUsername)) return "farcaster";
  if (stringValue(data.externalWalletAddress)) return "external_wallet";
  return stringValue(data.authType);
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function noStoreJson(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
