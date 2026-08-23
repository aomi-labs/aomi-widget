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
   Local development defaults to `http://127.0.0.1:8080`. Vercel production defaults to `https://api.aomi.dev`; previews default to `https://api-staging.aomi.dev`. For local full-stack startup use [../scripts/dev.sh](../scripts/dev.sh).

3. **Open in browser**:
   ```
   http://localhost:3000
   ```

## Runtime Wiring

- `AomiRuntimeProvider` is mounted in `aomi-frame.tsx`.
- `Thread` renders the assistant UI.
- `WalletTxHandler` consumes `pendingWalletRequests`, switches chains when needed, then resolves or rejects requests back into the runtime.
- Settings pages use `sessionScopedFetch()`, which always sends `X-Session-Id` and conditionally sends `X-API-Key`.
- Agent chat and MCP routes use the same-origin BFF. Set the server-only
  `AOMI_AGENT_API_URL` to the Rust api-server origin (`http://127.0.0.1:8082`
  locally, `https://agent-staging-tunnel.aomi.dev` for staging, and
  `https://agent-tunnel.aomi.dev` for production). Hosted builds fail closed
  when this value is absent.

## Local E2E

Current end-to-end testing is mostly manual:

1. Start the backend.
2. Start the frontend. Set `NEXT_PUBLIC_BACKEND_URL` only when using a non-default backend.
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
