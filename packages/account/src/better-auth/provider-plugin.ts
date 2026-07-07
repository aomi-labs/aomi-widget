import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import type { BetterAuthPlugin } from "better-auth";
import { z } from "zod";
import {
  providerSessionUserSeed,
  verifyProviderCredential,
} from "../providers/account-credentials";
import {
  getOrCreateAomiUserForBetterAuthSession,
  isIdentityAlreadyLinkedError,
} from "../service/account-service";
import { linkVerifiedProviderCredentialForUser } from "../service/provider-exchange";
import { buildAccountResponse } from "../db/queries";
import type { AomiAccountCredential } from "../types";

const bodySchema = z.discriminatedUnion("provider", [
  z.object({
    provider: z.literal("privy"),
    tokenKind: z.enum(["identity_token", "access_token"]).optional(),
    providerToken: z.string().min(1),
  }),
  z.object({
    provider: z.literal("para"),
    tokenKind: z.literal("session_jwt").optional(),
    providerToken: z.string().min(1),
    keyId: z.string().optional(),
  }),
]);

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
          const credential = ctx.body as AomiAccountCredential;
          let verified: Awaited<ReturnType<typeof verifyProviderCredential>>;
          try {
            verified = await verifyProviderCredential(credential);
          } catch (error) {
            throw new APIError("BAD_REQUEST", {
              message:
                error instanceof Error
                  ? error.message
                  : "provider_exchange_failed",
            });
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
          let aomiUser: Awaited<
            ReturnType<typeof getOrCreateAomiUserForBetterAuthSession>
          >;
          try {
            aomiUser = await getOrCreateAomiUserForBetterAuthSession({
              betterAuthUserId: betterAuthUser.id,
              email: seed.email,
              emailVerified: seed.emailVerified,
              name: seed.name,
              accessSignals: [
                {
                  type: "identity",
                  provider: verified.provider,
                  subject: verified.token.subject,
                },
              ],
            });
          } catch (error) {
            if (isIdentityAlreadyLinkedError(error)) {
              throw new APIError("CONFLICT", {
                message: "already_linked_to_another_account",
              });
            }
            throw error;
          }
          const resolution = await linkVerifiedProviderCredentialForUser({
            userId: aomiUser.id,
            verified,
          });
          if (resolution.status === "conflict") {
            throw new APIError("CONFLICT", {
              message: "already_linked_to_another_account",
            });
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
              user: resolution.user ?? aomiUser,
              betterAuthUserId: betterAuthUser.id,
              sessionExpiresAt: session.expiresAt,
            }),
          });
        },
      ),
    },
  };
}
