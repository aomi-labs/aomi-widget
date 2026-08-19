import { betterAuth } from "better-auth";
import { generateRandomString } from "better-auth/crypto";
import { nextCookies } from "better-auth/next-js";
import { bearer, deviceAuthorization, mcp, siwe } from "better-auth/plugins";
import { getPool } from "../db/pool";
import { readAccountAuthEnv } from "./env";
import { verifySiweMessage } from "./siwe";
import { aomiSiwsPlugin } from "./siws";
import { aomiProviderAuthPlugin } from "./provider-plugin";
import { observeBetterAuthFailure } from "./failure-observer";

const env = readAccountAuthEnv();
const HEADLESS_MCP_AUTH_METADATA = {
  aomi_headless_authentication: {
    proof: "siwe",
    nonce_endpoint: `${env.betterAuthUrl}/siwe/nonce`,
    verify_endpoint: `${env.betterAuthUrl}/siwe/verify`,
    oauth_register_endpoint: `${env.betterAuthUrl}/mcp/register`,
    oauth_authorize_endpoint: `${env.betterAuthUrl}/mcp/authorize`,
    oauth_token_endpoint: `${env.betterAuthUrl}/mcp/token`,
    session_token_usage:
      "Use the token returned by SIWE verify as Authorization: Bearer for MCP OAuth authorize, or keep the returned session cookie.",
    public_key_policy:
      "A public key is only an identifier; Aomi requires signed SIWE possession proof before MCP OAuth.",
  },
} as unknown as NonNullable<
  NonNullable<Parameters<typeof mcp>[0]["oidcConfig"]>["metadata"]
>;

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

function snakeCasedDevice(plugin: ReturnType<typeof deviceAuthorization>) {
  const definition = plugin.schema!.deviceCode;
  return {
    ...plugin,
    schema: {
      deviceCode: {
        ...definition,
        modelName: "ba_oauth_device_codes",
        fields: {
          ...definition.fields,
          deviceCode: {
            ...definition.fields.deviceCode,
            fieldName: "device_code",
          },
          userCode: {
            ...definition.fields.userCode,
            fieldName: "user_code",
          },
          userId: { ...definition.fields.userId, fieldName: "user_id" },
          expiresAt: {
            ...definition.fields.expiresAt,
            fieldName: "expires_at",
          },
          lastPolledAt: {
            ...definition.fields.lastPolledAt,
            fieldName: "last_polled_at",
          },
          pollingInterval: {
            ...definition.fields.pollingInterval,
            fieldName: "polling_interval",
          },
          clientId: { ...definition.fields.clientId, fieldName: "client_id" },
        },
      },
    },
  };
}

export const auth = betterAuth({
  database: getPool(),
  trustedOrigins: env.trustedOrigins,
  secret: env.betterAuthSecret,
  baseURL: env.betterAuthUrl,
  onAPIError: {
    onError: observeBetterAuthFailure,
  },
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
    aomiSiwsPlugin({
      domain: env.siweDomain,
      baseUrl: env.betterAuthUrl,
      getNonce: async () => generateRandomString(32, "a-z", "A-Z", "0-9"),
    }),
    bearer(),
    snakeCasedDevice(
      deviceAuthorization({
        schema: {},
        expiresIn: "15m",
        interval: "5s",
        verificationUri: "/connect/device",
        validateClient: async (clientId) => {
          const result = await getPool().query(
            `select 1 from ba_oauth_applications
              where client_id = $1 and disabled = false`,
            [clientId],
          );
          return Boolean(result.rowCount);
        },
      }),
    ),
    // OAuth provider for MCP clients (Claude, Codex): dynamic client
    // registration + PKCE + access tokens. `withMcpAuth` on the /api/mcp
    // route consumes the sessions this issues. /mcp/connect handles both
    // halves of the ceremony: sign-in (loginPage) and the explicit
    // approve/deny step (consentPage → POST /oauth2/consent).
    snakeCasedMcp(
      mcp({
        loginPage: "/connect",
        // `mcp()` copies its own `loginPage` over this one; the field is only
        // repeated because `OIDCOptions` requires it.
        oidcConfig: {
          loginPage: "/connect",
          consentPage: "/connect",
          defaultScope: "agent",
          scopes: ["agent"],
          requirePKCE: true,
          metadata: HEADLESS_MCP_AUTH_METADATA,
        },
      }),
    ),
    aomiProviderAuthPlugin(),
    nextCookies(),
  ],
});
