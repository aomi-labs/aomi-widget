# Aomi Miniapp

Aomi Miniapp is a minimal Next.js shell for running the full-page Aomi widget as a standalone web app. It gives the widget a same-origin backend proxy, optional wallet gas sponsorship through a server-side paymaster proxy, and the styling/runtime glue needed for Base Account wallet flows.

## What It Does

- Renders the Aomi chat/workflow widget full-screen.
- Proxies the widget's allowlisted `/api/*` calls to the Aomi backend.
- Supports Coinbase/Base Account wallet flows through the Aomi widget library.
- Optionally exposes `/api/paymaster` so clients can use ERC-7677 sponsorship without receiving the Pimlico API key.
- Keeps backend and paymaster secrets server-side.

## Requirements

- Node.js 20.9 or newer.
- pnpm, from the root Aomi workspace.

## Setup

```bash
pnpm install
cp .env.example .env.local
pnpm run dev:miniapp
```

Open `http://localhost:3000`.

Useful scripts:

```bash
pnpm run dev:miniapp       # start the dev server
pnpm run dev:miniapp:3000  # start on port 3000
pnpm run build:miniapp     # production build with TypeScript validation
pnpm --filter aomi-miniapp start  # serve the production build
pnpm run lint:miniapp      # lint the app
```

## Environment

```bash
AOMI_PROXY_BACKEND_URL=https://api.aomi.dev
NEXT_PUBLIC_WALLET_APP_NAME=Aomi
PIMLICO_PAYMASTER_URL=https://api.pimlico.io/v2/base/rpc?apikey=your_pimlico_api_key
```

`AOMI_PROXY_BACKEND_URL` is the server-side Aomi backend target for the catch-all API proxy.

`NEXT_PUBLIC_WALLET_APP_NAME` controls the app name shown in wallet connection flows.

`PIMLICO_PAYMASTER_URL` is server-only. Set it in local and Vercel environments so gas sponsorship runs through this app's `/api/paymaster` proxy without exposing the Pimlico API key.

## How It Works

The page entry point, `app/page.tsx`, passes the same-origin `/api/paymaster` proxy URL into the client widget wrapper in `app/aomi-app.tsx`. The private Pimlico URL stays server-only inside the API route.

The backend proxy lives in `app/api/[...slug]/route.ts`. It only forwards known widget routes and methods, strips sensitive browser headers, and returns generic upstream errors to clients.

The paymaster proxy lives in `app/api/paymaster/route.ts`. It accepts only the expected paymaster JSON-RPC methods, enforces body and batch limits, rate-limits callers, adds sponsor metadata to stub responses, and forwards requests to Pimlico using the server-side API key.

Styling is loaded from `app/globals.css`, including Tailwind and the Aomi widget stylesheet. Tailwind scans the local registry source so widget class changes are visible immediately during development.

The widget/runtime code is consumed through the normal package names, `@aomi-labs/widget-lib` and `@aomi-labs/react`, but both dependencies are workspace packages. The app behaves like a package consumer while resolving changes directly from `apps/registry/src`, `packages/react/src`, and `packages/client/src`.

## Production Notes

- Set `PIMLICO_PAYMASTER_URL` only in the server environment.
- Keep `AOMI_PROXY_BACKEND_URL` private to the server.
- On Vercel, make sure `PIMLICO_PAYMASTER_URL` is set for the deployed environment (`Production` or the relevant `Preview` branch). If it is missing, sponsored transactions will fail instead of falling back to user-paid gas.
- Configure Vercel's Git production branch to `prod`. Pushes to `prod` should create Production deployments; pushes to `main` and feature branches should create Preview deployments.
- Run `pnpm run build:miniapp` and `pnpm run lint:miniapp` before deploying.
