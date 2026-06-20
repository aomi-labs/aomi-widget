import { betterAuth } from "better-auth";
import { generateRandomString } from "better-auth/crypto";
import { nextCookies } from "better-auth/next-js";
import { bearer, jwt, siwe } from "better-auth/plugins";
import { pool } from "../db/pool";
import { createAomiBackendJwtOptions } from "./backend-jwt";
import { readAccountAuthEnv } from "./env";
import { verifySiweMessage } from "./siwe";
import { aomiProviderAuthPlugin } from "./provider-plugin";

const env = readAccountAuthEnv();

export const auth = betterAuth({
  database: pool,
  trustedOrigins: env.trustedOrigins,
  secret: env.betterAuthSecret,
  baseURL: env.betterAuthUrl,
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  account: {
    accountLinking: {
      enabled: true,
      allowDifferentEmails: false,
      trustedProviders: [],
    },
  },
  plugins: [
    siwe({
      domain: env.siweDomain,
      emailDomainName: env.siweEmailDomain,
      anonymous: true,
      getNonce: async () => generateRandomString(32, "a-z", "A-Z", "0-9"),
      verifyMessage: verifySiweMessage,
    }),
    jwt(createAomiBackendJwtOptions(env)),
    bearer(),
    aomiProviderAuthPlugin(),
    nextCookies(),
  ],
});
