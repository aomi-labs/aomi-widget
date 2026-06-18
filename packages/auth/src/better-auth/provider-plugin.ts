import { createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import type { BetterAuthPlugin } from "better-auth";
import { z } from "zod";
import {
  providerSessionUserSeed,
  verifyProviderCredential,
} from "../service/provider-exchange";
import {
  getOrCreateAomiUserForBetterAuthSession,
  linkProviderIdentity,
} from "../service/account-service";
import { buildAccountResponse } from "../db/queries";
import type { AomiAccountCredential } from "../types";

const bodySchema = z.object({
  provider: z.enum(["privy", "para"]),
  tokenKind: z
    .enum(["identity_token", "access_token", "session_jwt"])
    .optional(),
  providerToken: z.string().min(1),
  keyId: z.string().optional(),
  confirm: z.boolean().optional(),
});

export function aomiProviderAuthPlugin(): BetterAuthPlugin {
  return {
    id: "aomi-provider-auth",
    endpoints: {
      exchangeProviderToken: createAuthEndpoint(
        "/aomi/provider/exchange",
        {
          method: "POST",
          body: bodySchema,
          requireRequest: true,
        },
        async (ctx) => {
          const credential = ctx.body as AomiAccountCredential & {
            confirm?: boolean;
          };
          const verified = await verifyProviderCredential(credential);
          if (verified.provider === "cookie") {
            return ctx.json({ status: "linked" });
          }

          const seed = providerSessionUserSeed(verified);
          const existing = seed.email
            ? await ctx.context.internalAdapter.findUserByEmail(seed.email, {
                includeAccounts: false,
              })
            : null;
          const betterAuthUser =
            existing?.user ??
            (await ctx.context.internalAdapter.createUser({
              email: seed.email,
              emailVerified: seed.emailVerified,
              name: seed.name,
            }));
          const aomiUser = await getOrCreateAomiUserForBetterAuthSession({
            betterAuthUserId: betterAuthUser.id,
            email: seed.email,
            emailVerified: seed.emailVerified,
            name: seed.name,
          });
          const resolution = await linkProviderIdentity({
            userId: aomiUser.id,
            provider: verified.provider,
            subject: verified.token.subject,
            email: verified.token.email,
            emailVerified: verified.token.emailVerified,
            confirmed: credential.confirm,
            providerMetadata: {
              expiresAt: verified.token.expiresAt,
              linkedAccounts:
                verified.provider === "privy"
                  ? verified.token.linkedAccounts
                  : undefined,
              wallets:
                verified.provider === "para"
                  ? verified.token.wallets
                  : undefined,
              connectedWallets:
                verified.provider === "para"
                  ? verified.token.connectedWallets
                  : undefined,
            },
          });
          if (resolution.status === "needs_confirmation") {
            return ctx.json(resolution);
          }

          const session = await ctx.context.internalAdapter.createSession(
            betterAuthUser.id,
          );
          await setSessionCookie(ctx, {
            session,
            user: betterAuthUser,
          });
          return ctx.json({
            status: "linked",
            account: await buildAccountResponse({
              user: aomiUser,
              betterAuthUserId: betterAuthUser.id,
              sessionExpiresAt: session.expiresAt,
            }),
          });
        },
      ),
    },
  };
}
