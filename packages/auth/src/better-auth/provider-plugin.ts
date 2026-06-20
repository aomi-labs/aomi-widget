import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import type { BetterAuthPlugin } from "better-auth";
import { z } from "zod";
import {
  isVerifiedProviderTokenCredential,
  providerSessionUserSeed,
  verifyProviderCredential,
} from "../providers/account-credentials";
import {
  getOrCreateAomiUserForBetterAuthSession,
  linkProviderIdentity,
  syncProviderAttestedWallets,
} from "../service/account-service";
import { buildAccountResponse, findAomiUserById } from "../db/queries";
import type { AomiAccountCredential } from "../types";

const bodySchema = z.object({
  provider: z.string().min(1),
  tokenKind: z.string().min(1).optional(),
  providerToken: z.string().min(1),
  keyId: z.string().optional(),
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
          if (!isVerifiedProviderTokenCredential(verified)) {
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
            accessSignals: [
              {
                type: "identity",
                provider: verified.provider,
                subject: verified.token.subject,
              },
            ],
          });
          const resolution = await linkProviderIdentity({
            userId: aomiUser.id,
            provider: verified.provider,
            subject: verified.token.subject,
            email: verified.token.email,
            emailVerified: verified.token.emailVerified,
            providerMetadata: verified.token.providerMetadata,
          });
          if (resolution.status === "conflict") {
            throw new APIError("CONFLICT", {
              message: "already_linked_to_another_account",
            });
          }

          await syncProviderAttestedWallets({
            userId: aomiUser.id,
            provider: verified.walletAttestationProvider,
            subject: verified.token.subject,
            email: verified.token.email,
          });
          const session = await ctx.context.internalAdapter.createSession(
            betterAuthUser.id,
          );
          await setSessionCookie(ctx, {
            session,
            user: betterAuthUser,
          });
          const updatedAomiUser = await findAomiUserById(aomiUser.id);
          return ctx.json({
            status: "linked",
            account: await buildAccountResponse({
              user: updatedAomiUser ?? aomiUser,
              betterAuthUserId: betterAuthUser.id,
              sessionExpiresAt: session.expiresAt,
            }),
          });
        },
      ),
    },
  };
}
