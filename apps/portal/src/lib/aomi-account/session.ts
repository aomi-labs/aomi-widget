import { auth } from "@aomi-labs/auth/better-auth";
import {
  getAccountResponseForBetterAuthSession,
  getOrCreateAomiUserForBetterAuthSession,
} from "@aomi-labs/auth/service/account-service";

type BetterAuthSessionResult = {
  user?: {
    id: string;
    email?: string | null;
    emailVerified?: boolean;
    name?: string | null;
    image?: string | null;
  };
  session?: {
    expiresAt?: Date | string | number | null;
    fresh?: boolean;
  };
} | null;

export async function getBetterAuthSession(req: Request) {
  return (await auth.api.getSession({
    headers: req.headers,
  })) as BetterAuthSessionResult;
}

export async function requireAomiSession(req: Request) {
  const session = await getBetterAuthSession(req);
  if (!session?.user?.id) return null;
  const user = await getOrCreateAomiUserForBetterAuthSession({
    betterAuthUserId: session.user.id,
    email: session.user.email,
    emailVerified: session.user.emailVerified,
    name: session.user.name,
    avatarUrl: session.user.image,
  });
  return { session, user };
}

export async function accountResponseFromSession(req: Request) {
  const session = await getBetterAuthSession(req);
  if (!session?.user?.id) {
    return {
      user: null,
      linkedAccounts: [],
      wallets: [],
      session: null,
    } as const;
  }
  return getAccountResponseForBetterAuthSession({
    betterAuthUserId: session.user.id,
    email: session.user.email,
    emailVerified: session.user.emailVerified,
    name: session.user.name,
    avatarUrl: session.user.image,
    expiresAt: session.session?.expiresAt,
    fresh: session.session?.fresh,
  });
}

export function json(status: number, body: unknown): Response {
  return Response.json(body, { status });
}
