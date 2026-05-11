---
title: Frontend
owner: frontend
status: reference
area: frontend
review_after_days: 45
sources_of_truth:
  - frontend/src
  - frontend/package.json
---

# Aomi Labs - Frontend

A TypeScript Next.js client for Aomi chat, wallet request handling, and settings/account flows.

## Current Shape

- `frontend/src/components/aomi-frame.tsx` is the runtime entrypoint.
- `@aomi-labs/react` provides the thread/runtime client.
- `frontend/src/components/wallet-tx-handler.tsx` bridges pending wallet requests to wagmi.
- `frontend/src/lib/settings-api.ts` is the direct REST client for account, apps, and API-key settings.

The durable walkthrough for this workspace lives in [../docs/topics/frontend-e2e.md](../docs/topics/frontend-e2e.md).

## Setup And Development

1. **Install dependencies**:
   ```bash
   pnpm install --frozen-lockfile
   ```

2. **Start development server**:
   ```bash
   pnpm dev
   ```
   The runtime reads `NEXT_PUBLIC_BACKEND_URL`, defaulting to `http://localhost:8080`. For local full-stack startup use [../scripts/dev.sh](../scripts/dev.sh).

   For wallet-backed payment flows, prefer the built-in same-origin proxy:
   ```bash
   AOMI_BACKEND_PROXY_TARGET=http://localhost:8080 pnpm dev
   ```
   With that set, portal talks to `"/api/*"` through Next rewrites instead of making cross-origin browser requests to `http://localhost:8080` directly. This matters for x402 because the browser must be able to read the `Payment-Required` header on `402` responses.

3. **Open in browser**:
   ```
   http://localhost:3000
   ```

## Runtime Wiring

- `AomiRuntimeProvider` is mounted in `aomi-frame.tsx`.
- `Thread` renders the assistant UI.
- `WalletTxHandler` consumes `pendingWalletRequests`, switches chains when needed, then resolves or rejects requests back into the runtime.
- Settings pages use `settingsApiFetch()`, which always sends `X-Session-Id` and conditionally sends `X-API-Key`.

## Local E2E

Current end-to-end testing is mostly manual:

1. Start the backend.
2. Start the frontend against that backend. For x402/MPP browser testing, prefer `AOMI_BACKEND_PROXY_TARGET=http://localhost:8080 pnpm dev` so the requests stay same-origin.
3. Exercise chat, wallet requests, and settings screens in the browser.
4. Verify wallet callbacks and settings headers in backend logs or network tools.

There is not yet a full in-repo browser harness for `frontend -> backend -> wallet callback -> frontend state`.

## Commands

- `pnpm dev` - start the development server
- `pnpm dev:localhost` - force localhost-style local runtime URLs
- `pnpm build` - Build for production
- `pnpm test` - run frontend tests
- `pnpm lint` - run ESLint
- `pnpm type-check` - run Next type generation and TypeScript checking

## Related Docs

- [../docs/topics/frontend-e2e.md](../docs/topics/frontend-e2e.md)
- [../docs/topics/tool-flow.md](../docs/topics/tool-flow.md)
- [../docs/topics/auth.md](../docs/topics/auth.md)
