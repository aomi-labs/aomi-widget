import { createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import type { BetterAuthPlugin } from "better-auth";
import { z } from "zod";
import {
  providerSessionUserSeed,
  verifyProviderCredential,
} from "../service/provider-exchange";
import {
  fetchAttestedProviderWallets,
  getOrCreateAomiUserForBetterAuthSession,
  linkProviderIdentity,
  syncProviderWallets,
} from "../service/account-service";
import { buildAccountResponse, findAomiUserById } from "../db/queries";
import type { AomiAccountCredential } from "../types";

const bodySchema = z.object({
  provider: z.enum(["privy", "para"]),
  tokenKind: z
    .enum(["identity_token", "access_token", "session_jwt"])
    .optional(),
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
          if (resolution.status === "conflict") {
            return ctx.json(
              {
                ...resolution,
                error: "already_linked_to_another_account",
              },
              { status: 409 },
            );
          }

          await syncAttestedWallets({
            userId: aomiUser.id,
            provider: verified.provider,
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

/** Best-effort embedded-wallet sync after a successful provider identity
 *  link (Phase D session-creating path). Fetches server-side attested
 *  wallets and reconciles them into the `aomi_wallets` graph. No-op when REST
 *  creds are unconfigured or the fetch fails. */
async function syncAttestedWallets(input: {
  userId: string;
  provider: "privy" | "para";
  subject: string;
  email?: string | null;
}): Promise<void> {
  const attested = await fetchAttestedProviderWallets({
    provider: input.provider,
    subject: input.subject,
    email: input.email,
  });
  if (!attested) return;
  await syncProviderWallets({
    userId: input.userId,
    provider: input.provider,
    attested,
  });
}
