# Base

Base is a minimal Next.js shell for running the full-page Aomi widget as a standalone web app. It gives the widget a same-origin backend proxy, optional wallet gas sponsorship through a server-side paymaster proxy, and the styling/runtime glue needed for Base Account wallet flows.

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
pnpm run dev:base
```

Open `http://localhost:3000`.

Useful scripts:

```bash
pnpm run dev:base       # start the dev server
pnpm run dev:base:3000  # start on port 3000
pnpm run build:base     # production build with TypeScript validation
pnpm --filter base start  # serve the production build
pnpm run lint:base      # lint the app
```

## Environment

```bash
AOMI_PROXY_BACKEND_URL=https://api.aomi.dev
NEXT_PUBLIC_WALLET_APP_NAME=Aomi
PIMLICO_PAYMASTER_URL=https://api.pimlico.io/v2/base/rpc?apikey=your_pimlico_api_key
PAYMASTER_ALLOWED_ORIGINS=http://localhost:3000,https://your-ngrok-domain.ngrok-free.app
PAYMASTER_ALLOW_ORIGINLESS_REQUESTS=
PAYMASTER_TRUST_FORWARDED_IP_HEADERS=
```

`AOMI_PROXY_BACKEND_URL` is the server-side Aomi backend target for the catch-all API proxy.

`NEXT_PUBLIC_WALLET_APP_NAME` controls the app name shown in wallet connection flows.

`PIMLICO_PAYMASTER_URL` is server-only. Set it in local and Vercel environments so gas sponsorship runs through this app's `/api/paymaster` proxy without exposing the Pimlico API key.

`PAYMASTER_ALLOWED_ORIGINS` is an optional comma-separated list of extra browser origins allowed to call `/api/paymaster`. Same-origin localhost, ngrok, and Vercel requests are allowed automatically when the browser sends a matching `Origin` header, but this env is useful when testing through a separate local host or a pinned tunnel URL.

`PAYMASTER_ALLOW_ORIGINLESS_REQUESTS` is an explicit opt-in for native wallet paymaster relays that do not send a browser `Origin` header. Leave it empty by default; set it to `1` only for controlled local/ngrok testing or another environment where this endpoint is protected by a separate access control.

`PAYMASTER_TRUST_FORWARDED_IP_HEADERS` controls whether `/api/paymaster` keys rate limits from `x-forwarded-for` / `x-real-ip`. Leave it empty for direct local dev. Set it to `1` only behind a trusted proxy that normalizes those headers; Vercel is trusted automatically when `VERCEL=1`.

## How It Works

The page entry point, `app/page.tsx`, passes the same-origin `/api/paymaster` proxy URL into the client widget wrapper in `app/aomi-app.tsx`. The private Pimlico URL stays server-only inside the API route.

The backend proxy lives in `app/api/[...slug]/route.ts`. It only forwards known widget routes and methods, strips sensitive browser headers, and returns generic upstream errors to clients.

The paymaster proxy lives in `app/api/paymaster/route.ts`. It accepts only the expected paymaster JSON-RPC methods, enforces body and batch limits, rate-limits callers, adds sponsor metadata to stub responses, and forwards requests to Pimlico using the server-side API key.

Styling is loaded from `app/globals.css`, including Tailwind and the Aomi widget stylesheet. Tailwind scans the local registry source so widget class changes are visible immediately during development.

The widget/runtime code is consumed through the normal package names, `@aomi-labs/widget-lib` and `@aomi-labs/react`, but both dependencies are workspace packages. The app behaves like a package consumer while resolving changes directly from `apps/shadcn-registry/src`, `packages/react/src`, and `packages/client/src`.

## Production Notes

- Set `PIMLICO_PAYMASTER_URL` only in the server environment.
- Keep `PAYMASTER_ALLOWED_ORIGINS` narrow. Add exact local, ngrok, preview, or production origins when the paymaster caller is not same-origin.
- Keep `PAYMASTER_ALLOW_ORIGINLESS_REQUESTS` disabled unless a native wallet relay requires it and you have another protection layer in front of `/api/paymaster`.
- Set `PAYMASTER_TRUST_FORWARDED_IP_HEADERS=1` only for trusted local tunnel/proxy setups that overwrite forwarded IP headers.
- Keep `AOMI_PROXY_BACKEND_URL` private to the server.
- On Vercel, make sure `PIMLICO_PAYMASTER_URL` is set for the deployed environment (`Production` or the relevant `Preview` branch). If it is missing, sponsored transactions will fail instead of falling back to user-paid gas.
- Configure Vercel's Git production branch to `prod`. Pushes to `prod` should create Production deployments; pushes to `main` and feature branches should create Preview deployments.
- Run `pnpm run build:base` and `pnpm run lint:base` before deploying.
