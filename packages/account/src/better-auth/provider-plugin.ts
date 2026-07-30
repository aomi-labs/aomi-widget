import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import type { BetterAuthPlugin } from "better-auth";
import { decodeJwt, decodeProtectedHeader } from "jose";
import { z } from "zod";
import {
  providerSessionUserSeed,
  verifyProviderCredential,
} from "../providers";
import { signInWithVerifiedProviderCredential } from "../service/provider-exchange";
import { buildAccountResponse } from "../db/queries";
import { observeAccountDiagnostic } from "../observability";
import type { AomiAccountCredential } from "../types";

function providerCredentialDiagnostic(token: string) {
  try {
    const { aud, iss, exp, sub } = decodeJwt(token);
    const { kid, alg } = decodeProtectedHeader(token);
    return {
      audience: bounded(Array.isArray(aud) ? aud.join(",") : aud),
      issuer: bounded(iss),
      expires_at: typeof exp === "number" ? exp : null,
      subject_present: Boolean(sub),
      key_id: bounded(kid),
      algorithm: bounded(alg),
    };
  } catch {
    return {
      audience: null,
      issuer: null,
      expires_at: null,
      subject_present: false,
      key_id: null,
      algorithm: null,
    };
  }
}

const bodySchema = z.object({
  provider: z.string().trim().min(1),
  tokenKind: z.string().trim().min(1).optional(),
  providerToken: z.string().min(1),
  keyId: z.string().trim().min(1).optional(),
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
            if (!isExpectedProviderCredentialError(error)) throw error;
            observeAccountDiagnostic({
              kind: "provider.credential_rejected",
              attributes: {
                provider: bounded(credential.provider),
                error: bounded(
                  error instanceof Error ? error.message : String(error),
                ),
                ...providerCredentialDiagnostic(credential.providerToken),
              },
              context: {
                routeFamily: "/api/auth/[...all]",
                operation: "account.provider_exchange",
                method: "POST",
              },
              response: {
                status: 400,
                error: "invalid_provider_credential",
              },
            });
            throw new APIError("BAD_REQUEST", {
              message: "invalid_provider_credential",
              cause: error,
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
          const resolution = await signInWithVerifiedProviderCredential({
            betterAuthUserId: betterAuthUser.id,
            verified,
            email: seed.email,
            name: seed.name,
          });
          if (resolution.status === "conflict") {
            observeAccountDiagnostic({
              kind: "provider.link_conflict",
              attributes: {
                provider: bounded(verified.provider),
                signal_type: bounded(resolution.signalType),
              },
              context: {
                routeFamily: "/api/auth/[...all]",
                operation: "account.provider_link",
                method: "POST",
              },
              response: {
                status: 409,
                error: "already_linked_to_another_account",
              },
            });
            throw new APIError("CONFLICT", {
              message: "already_linked_to_another_account",
            });
          }
          const aomiUser = resolution.user;
          if (!aomiUser) throw new Error("resolved_account_not_found");

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
              session: {
                carrier: "better_auth",
                betterAuthUserId: betterAuthUser.id,
                expiresAt: session.expiresAt,
              },
            }),
          });
        },
      ),
    },
  };
}

function bounded(value: unknown): string | null {
  return typeof value === "string" ? value.slice(0, 160) : null;
}

function isExpectedProviderCredentialError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = (error as Error & { code?: unknown }).code;
  if (
    typeof code === "string" &&
    (code.startsWith("ERR_JWT_") || code.startsWith("ERR_JWS_"))
  ) {
    return true;
  }
  return (
    error.message === "provider_not_enabled" ||
    error.message.startsWith("invalid_provider_") ||
    error.message.startsWith("provider_token_") ||
    error.message.startsWith("Privy token is missing") ||
    error.message.startsWith("Privy access token is missing")
  );
}
