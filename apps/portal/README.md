---
title: Portal
owner: frontend
status: reference
area: frontend-auth-bff
review_after_days: 45
sources_of_truth:
  - src/app/api
  - src/proxy.ts
  - ../../packages/account
---

# Aomi Portal

Portal is the sole browser auth, account, and BFF host. It serves the first-party
chat UI and accepts credentialed requests from trusted external widget origins.
Landing and package consumers do not mount their own BetterAuth or account
routes.

## Runtime shape

- `/api/auth/*` mounts BetterAuth, including SIWE.
- `/api/aomi/*` resolves canonical accounts, exchanges verified Para/Privy
  credentials, manages linked identities/wallets, signs out, and supports CLI
  device auth.
- `/api/[...slug]` applies route policy and proxies allowed backend traffic,
  minting a short-lived AccountBearer for an authenticated canonical user.
- `src/proxy.ts` applies credentialed CORS to `/api/*` using the exact same
  trusted-origin resolver as BetterAuth.
- `src/components/shell/portal-aomi-frame.tsx` is the first-party compound
  widget integration. External consumers should normally use `AomiWidget`.

## Local setup

```bash
cp apps/portal/LOCAL_ENV.example apps/portal/.env.local
pnpm install --frozen-lockfile
pnpm --filter portal dev
```

Portal runs at `http://localhost:3000`. The raw product backend normally runs
at `http://127.0.0.1:8080`. Landing and the checked-in Vite consumer run on
different origins and call Portal directly with credentials.

For the complete backend + Portal stack, use:

```bash
./scripts/dev-auth-stack.sh start
```

## Auth environment

The full local template is [`LOCAL_ENV.example`](LOCAL_ENV.example). Important
rules:

- `BETTER_AUTH_URL` and `AOMI_AUTH_DOMAIN` identify Portal, not Landing or the
  raw backend.
- `DATABASE_URL` is shared with the canonical account graph.
- `AOMI_TRUSTED_ORIGINS` is a comma-separated list of exact browser origins
  (scheme, host, optional port, no path). Standard local Landing/Vite origins
  and hosted `https://aomi.dev` are included by the resolver; add every other
  production or preview consumer explicitly.
- Para's browser publishable key must match `PARA_JWT_AUDIENCE`; keep
  `PARA_API_SECRET_KEY` server-only.
- Privy's browser app id must match `PRIVY_APP_ID`; app secrets and JWT
  verification keys remain server-only.
- `PORTAL_SERVICE_PRIVATE_KEY`, BetterAuth secrets, provider secrets, and
  database URLs must never use `NEXT_PUBLIC_*` or enter consumer bundles.

## Cross-origin contract

`AomiWidget` uses `credentials: "include"` for REST, polling, and native SSE.
Portal permits only configured origins and returns:

```text
Access-Control-Allow-Origin: <exact trusted origin>
Access-Control-Allow-Credentials: true
Vary: Origin
```

Supported request headers include authorization, content type, app keys,
session/thread ids, and SSE resume ids. Untrusted browser origins receive 403;
same-origin, CLI, and server requests without an `Origin` header continue to
the route policy unchanged.

Credentialed CORS is intended for same-site origins such as `aomi.dev` and
`chat.aomi.dev`. An unrelated top-level consumer domain should put Portal
behind a same-site reverse proxy or deploy a customer-domain Portal. Adding an
origin to the allowlist does not override browser SameSite or third-party-cookie
policy.

## Verification

```bash
pnpm --filter portal test
pnpm --filter portal type-check
pnpm --filter portal build
pnpm exec vitest run packages/account/test apps/portal/src/proxy.test.ts
```

For a live consumer check, verify anonymous thread creation, Para/Privy or SIWE
login, `/api/aomi/account`, authenticated thread persistence after refresh,
chat completion, and a wallet signing prompt.

## Commands

- `pnpm --filter portal dev` — start Portal on port 3000
- `pnpm --filter portal build` — production build
- `pnpm --filter portal test` — Portal test harness
- `pnpm --filter portal type-check` — Next route generation plus TypeScript
- `pnpm --filter portal lint` — workspace lint
