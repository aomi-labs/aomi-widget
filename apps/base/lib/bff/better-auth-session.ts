import type { BetterAuthLegacyLinks } from "./canonical-user";
import { auth } from "./auth";

export type BetterAuthSession = {
  betterAuthUserId: string;
  legacy: BetterAuthLegacyLinks;
};

function splitHeader(value: string | null): string[] {
  return (value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseWallets(value: string | null): BetterAuthLegacyLinks["wallets"] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return undefined;
        const record = item as Record<string, unknown>;
        if (
          typeof record.chainType !== "string" ||
          typeof record.chainId !== "number" ||
          typeof record.address !== "string"
        ) {
          return undefined;
        }
        return {
          chainType: record.chainType,
          chainId: record.chainId,
          address: record.address,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  } catch {
    return [];
  }
}

export async function resolveBetterAuthSession(
  headers: Headers,
): Promise<BetterAuthSession | null> {
  const session = (await auth.api
    .getSession({ headers })
    .catch(() => null)) as unknown;
  const user = sessionUser(session);
  if (user?.id) {
    return {
      betterAuthUserId: user.id,
      legacy: {
        verifiedEmails:
          user.email && user.emailVerified === true ? [user.email] : [],
        privySubjects: user.privySubjects,
        wallets: user.wallets,
      },
    };
  }

  // Header mode is intentionally env-gated for local tests and BFF smoke tests.
  if (process.env.AOMI_BFF_TRUST_DEV_AUTH_HEADERS !== "1") {
    return null;
  }

  const betterAuthUserId = headers.get("x-aomi-betterauth-user-id")?.trim();
  if (!betterAuthUserId) return null;

  return {
    betterAuthUserId,
    legacy: {
      privySubjects: splitHeader(headers.get("x-aomi-privy-subjects")),
      verifiedEmails: splitHeader(headers.get("x-aomi-verified-emails")),
      wallets: parseWallets(headers.get("x-aomi-wallets")),
    },
  };
}

function sessionUser(session: unknown):
  | {
      id: string;
      email?: string;
      emailVerified?: boolean;
      privySubjects?: string[];
      wallets?: BetterAuthLegacyLinks["wallets"];
    }
  | undefined {
  if (!session || typeof session !== "object") return undefined;
  const user = (session as { user?: unknown }).user;
  if (!user || typeof user !== "object") return undefined;
  const record = user as Record<string, unknown>;
  if (typeof record.id !== "string") return undefined;

  return {
    id: record.id,
    email: typeof record.email === "string" ? record.email : undefined,
    emailVerified:
      typeof record.emailVerified === "boolean"
        ? record.emailVerified
        : undefined,
    privySubjects: Array.isArray(record.privySubjects)
      ? record.privySubjects.filter(
          (value): value is string => typeof value === "string",
        )
      : undefined,
    wallets: parseWallets(
      typeof record.wallets === "string" ? record.wallets : null,
    ),
  };
}
