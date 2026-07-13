# @aomi-labs/account

Server-only BetterAuth and canonical Aomi account integration. This package
resolves or adopts canonical users, links verified provider identities and
wallets, and mints AccountBearers for the backend proxy.

Do not import it into browser code. Browser consumers use
`@aomi-labs/widget-lib` and call Portal.

## Portal ownership

One Portal deployment owns:

- `/api/auth/*` for BetterAuth and SIWE;
- `/api/aomi/*` for canonical accounts and verified Para/Privy exchange;
- protected backend proxying with server-minted AccountBearers;
- the trusted-origin policy used by both BetterAuth and credentialed CORS.

Landing pages and external widgets must not mount a second auth/account route
tree.

## Required environment

```bash
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=replace-with-a-production-secret
BETTER_AUTH_URL=https://chat.example.com
AOMI_AUTH_DOMAIN=chat.example.com

# Exact browser origins, comma separated, no paths
AOMI_TRUSTED_ORIGINS=https://app.example.com,https://preview.example.com

# AccountBearer signer used by the Portal backend proxy
PORTAL_SERVICE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
```

`DATABASE_URL` is the one database shared by BetterAuth session tables and the
canonical `users` / `auth_providers` / `public_keys` graph. There is no database
fallback.

Direct browser consumers should share a parent site with Portal. For unrelated
top-level domains, use a customer-domain Portal or same-site reverse proxy;
trusted origins and credentialed CORS do not bypass browser third-party-cookie
policy.

## Provider verification

For Para:

```bash
PARA_JWT_AUDIENCE=public_identifier_used_by_the_browser
PARA_API_SECRET_KEY=server_only_para_rest_secret
# Optional override
PARA_JWKS_URL=https://...
```

For Privy:

```bash
PRIVY_APP_ID=public_app_id_used_by_the_browser
PRIVY_APP_SECRET=server_only_app_secret
PRIVY_JWT_VERIFICATION_KEY=server_only_access_token_key
PRIVY_IDENTITY_JWT_VERIFICATION_KEY=server_only_identity_token_key
```

Only the Para publishable identifier or Privy app id belongs in browser
configuration. Provider REST secrets, verification keys, BetterAuth secrets,
database URLs, and bearer signing keys are server-only.

## Local development

Portal runs on `http://localhost:3000`. The local trusted-origin resolver also
allows the standard consumer origins on port 3001. See
`apps/portal/LOCAL_ENV.example` and run the complete stack with:

```bash
./scripts/dev-auth-stack.sh start
```

## Verification

```bash
pnpm --filter @aomi-labs/account type-check
pnpm exec vitest run packages/account/test apps/portal/src/proxy.test.ts
```
