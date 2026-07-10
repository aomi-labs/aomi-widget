import { betterAuth } from "better-auth";
import { generateRandomString } from "better-auth/crypto";
import { nextCookies } from "better-auth/next-js";
import { bearer, mcp, siwe } from "better-auth/plugins";
import { getPool } from "../db/pool";
import { readAccountAuthEnv } from "./env";
import { verifySiweMessage } from "./siwe";
import { aomiProviderAuthPlugin } from "./provider-plugin";

const env = readAccountAuthEnv();

// BetterAuth's storage lives in the SAME database as the canonical account
// graph, but under our house schema style: `ba_`-prefixed snake_case tables
// (`ba_users`, `ba_sessions`, `ba_accounts`, `ba_verifications`,
// `ba_wallet_addresses`) so `\dt` reads as one namespaced framework block, not
// a parallel identity graph. These tables carry LOGIN state only (cookie
// sessions, credential links, short-lived challenges); durable identity stays
// in `users` / `auth_providers` / `public_keys`.
function snakeCasedSiwe(plugin: ReturnType<typeof siwe>) {
  const { fields, ...walletAddress } = plugin.schema!.walletAddress;
  return {
    ...plugin,
    schema: {
      walletAddress: {
        ...walletAddress,
        modelName: "ba_wallet_addresses",
        fields: {
          userId: { ...fields.userId, fieldName: "user_id" },
          address: fields.address,
          chainId: { ...fields.chainId, fieldName: "chain_id" },
          isPrimary: { ...fields.isPrimary, fieldName: "is_primary" },
          createdAt: { ...fields.createdAt, fieldName: "created_at" },
        },
      },
    },
  };
}

// Same ba_ + snake_case treatment for the MCP plugin's OAuth-provider models
// (client registrations, access tokens, consents). Tables live in
// supabase/migrations/*_better_auth_mcp_oauth_tables.sql (product-mono);
// keep names in lockstep.
function snakeCasedMcp(plugin: ReturnType<typeof mcp>) {
  const modelNames: Record<string, string> = {
    oauthApplication: "ba_oauth_applications",
    oauthAccessToken: "ba_oauth_access_tokens",
    oauthConsent: "ba_oauth_consents",
  };
  const snake = (name: string) =>
    name.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
  const schema = Object.fromEntries(
    Object.entries(plugin.schema!).map(([model, definition]) => [
      model,
      {
        ...definition,
        modelName: modelNames[model] ?? model,
        fields: Object.fromEntries(
          Object.entries(definition.fields).map(([name, field]) => [
            name,
            { ...field, fieldName: snake(name) },
          ]),
        ),
      },
    ]),
  ) as unknown as typeof plugin.schema;
  return { ...plugin, schema };
}

export const auth = betterAuth({
  database: getPool(),
  trustedOrigins: env.trustedOrigins,
  secret: env.betterAuthSecret,
  baseURL: env.betterAuthUrl,
  user: {
    modelName: "ba_users",
    fields: {
      emailVerified: "email_verified",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  session: {
    modelName: "ba_sessions",
    fields: {
      expiresAt: "expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
      ipAddress: "ip_address",
      userAgent: "user_agent",
      userId: "user_id",
    },
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  account: {
    modelName: "ba_accounts",
    fields: {
      accountId: "account_id",
      providerId: "provider_id",
      userId: "user_id",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      idToken: "id_token",
      accessTokenExpiresAt: "access_token_expires_at",
      refreshTokenExpiresAt: "refresh_token_expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    accountLinking: {
      enabled: true,
      allowDifferentEmails: false,
      trustedProviders: [],
    },
  },
  verification: {
    modelName: "ba_verifications",
    fields: {
      expiresAt: "expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  plugins: [
    snakeCasedSiwe(
      siwe({
        domain: env.siweDomain,
        emailDomainName: env.siweEmailDomain,
        anonymous: true,
        getNonce: async () => generateRandomString(32, "a-z", "A-Z", "0-9"),
        verifyMessage: verifySiweMessage,
      }),
    ),
    bearer(),
    // OAuth provider for MCP clients (Claude, Codex): dynamic client
    // registration + PKCE + access tokens. `withMcpAuth` on the /api/mcp
    // route consumes the sessions this issues. The login page is the portal
    // root, which hosts the wallet/SIWE sign-in.
    snakeCasedMcp(mcp({ loginPage: "/" })),
    aomiProviderAuthPlugin(),
    nextCookies(),
  ],
});
