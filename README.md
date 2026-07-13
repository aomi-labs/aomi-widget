# Aomi

**The best blockchain harness for agentic AI - on-chain execution with runtime, skills, and component library.** Aomi ships five entry points from one repo — a React widget, a headless runtime, a TypeScript client, a CLI, and an agent skill — all backed by an Aomi-compatible backend.

- **Widget** — `<AomiWidget />`, a drop-in React chat surface with auth, accounts, wallets, and on-chain actions.
- **Headless runtime** — `@aomi-labs/react` hooks and providers that manage concurrent threads, backend polling, control state, and wallet events, with no UI opinions.
- **TypeScript client** — `@aomi-labs/client`, a platform-agnostic client for Node.js and browsers.
- **CLI** — `aomi`, a terminal client for chatting with Aomi agents and signing on-chain transactions directly from your shell.
- **Agent skill** — `aomi-transact`, a Claude / Codex skill that teaches an AI agent to operate the CLI as an on-chain tool.
- **License:** MIT

## What is Aomi?

Aomi is an AI-assistant framework for on-chain apps. It gives you an agent that can answer questions about crypto, DeFi, wallets, and markets — and, when asked, queue real wallet transactions that your user (or your own key, from the CLI) can sign.

You pick how you integrate:

| Entry point       | Package                          | Use when you want…                                   |
| ----------------- | -------------------------------- | ---------------------------------------------------- |
| React widget      | `@aomi-labs/widget-lib`          | A prebuilt chat UI inside a web app                  |
| Headless runtime  | `@aomi-labs/react`               | Your own UI on top of Aomi's thread + wallet runtime |
| TypeScript client | `@aomi-labs/client`              | Node or browser programmatic access, no React        |
| CLI               | `@aomi-labs/client` (`aomi` bin) | Chat + sign transactions from a terminal             |
| Agent skill       | `skills/aomi-transact`           | Let an AI agent use Aomi as a tool                   |

All entry points share a common backend API, so a conversation started in the widget can be continued from the CLI and vice versa.

## Key features

- **AI chat + on-chain actions in one loop** — the agent can queue wallet requests inside any conversation.
- **Drop-in React widget** — one `<AomiWidget />` renders the chat, credentialed Portal transport, account bridge, wallet providers, and execution defaults.
- **Headless runtime for custom UIs** — concurrent thread management, per-thread model/namespace state, backend polling/SSE, event bus, and wallet request handler, exposed as React hooks.
- **Terminal-first CLI** — `aomi chat`, `aomi tx list`, `aomi tx simulate`, `aomi tx sign`, session management, secret ingestion.
- **Account auth in CLI** — `aomi account login` supports browser-based provider auth or native no-browser SIWE, and `aomi account whoami` confirms the session is bound to the canonical Aomi account.
- **Account Abstraction built in** — EIP-4337 and EIP-7702 signing via Alchemy or Pimlico, with automatic mode fallback.
- **Batch simulation** — dry-run multi-step flows (approve → swap) on a forked chain before signing.
- **Agent-ready** — install `aomi-transact` as a Claude/Codex skill and your agent can transact on-chain autonomously.
- **Provider-selectable auth** — use Para, Privy, or the providerless external-wallet/SIWE mode without changing the widget component.
- **Shared session model** — threads, messages, and wallet requests flow through the same backend API across widget, runtime, CLI, and skill.

## Install

Pick the package for your entry point. All five live in this monorepo.

```bash
# React widget + UI components (the runtime is included)
pnpm install @aomi-labs/widget-lib

# Headless runtime only (no UI)
pnpm install @aomi-labs/react

# TypeScript client (Node / browser, no React)
pnpm install @aomi-labs/client

# CLI (installs the `aomi` executable)
npm install -g @aomi-labs/client
```

Or copy widget source into your repo via the shadcn registry:

```bash
npx shadcn add https://aomi.dev/r/aomi-widget.json
```

---

## Widget: `<AomiWidget />`

A prebuilt React chat widget for on-chain AI assistants. Provider choice is a
configuration value on the one widget component. Aomi supplies the frame,
credentialed transport, account bridge, chain catalogs, Solana networks,
execution defaults, and wallet-kit provider tree.

```tsx
import { AomiWidget } from "@aomi-labs/widget-lib";
import { paraAuth } from "@aomi-labs/widget-lib/providers/para";
import "@aomi-labs/widget-lib/styles.css";

export function Assistant() {
  return (
    <AomiWidget
      apiUrl="https://chat.aomi.dev"
      auth={paraAuth({
        apiKey: process.env.NEXT_PUBLIC_PARA_API_KEY,
      })}
      height="640px"
    />
  );
}
```

The package CSS is precompiled; consumers do not need Tailwind configuration or
an `@source` rule for widget internals. `apiUrl` must be the Portal/BFF origin,
not the raw backend origin. Portal owns BetterAuth, provider credential
exchange, canonical accounts, and the browser-to-backend proxy.

Use `auth={privyAuth({ appId })}` from the Privy provider subpath for Privy.
Omit `auth` (or pass `auth={false}`) for external wallets and Portal SIWE
without an embedded auth provider. Provider helpers keep unused SDKs out of the
consumer bundle while the widget component stays the same.

For a cross-origin deployment, register the exact consumer origin in Portal's
comma-separated `AOMI_TRUSTED_ORIGINS`. The widget sends
`credentials: "include"` for REST, polling, and SSE; do not add auth routes or
a second BetterAuth instance to the consumer app. The client-side Para key or
Privy app id must match the provider verification configuration on Portal.

Use Portal and the consumer under the same parent site (for example,
`chat.example.com` and `app.example.com`). For an unrelated consumer domain,
serve Portal behind a same-site reverse proxy or a customer-domain Portal;
trusted CORS alone cannot override browser third-party-cookie restrictions.

Providerless mode uses the same component:

```tsx
import { AomiWidget } from "@aomi-labs/widget-lib";
import "@aomi-labs/widget-lib/styles.css";

export function Assistant() {
  return <AomiWidget apiUrl="https://chat.aomi.dev" height="640px" />;
}
```

### Advanced wallet configuration

Override only what differs from the built-in EVM and Solana catalogs:

```tsx
import { base, mainnet } from "wagmi/chains";
import { AomiWidget } from "@aomi-labs/widget-lib";
import { paraAuth } from "@aomi-labs/widget-lib/providers/para";

export function Assistant() {
  return (
    <AomiWidget
      apiUrl="https://chat.aomi.dev"
      auth={paraAuth({
        apiKey: process.env.NEXT_PUBLIC_PARA_API_KEY,
      })}
      wallets={{
        evm: {
          chains: [mainnet, base],
          wallets: ["metamask", "rabby", "coinbase"],
          walletConnectProjectId:
            process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
        },
        solana: false,
      }}
    />
  );
}
```

`AomiWalletKitProvider` and the `AomiFrame` compound API remain exported for
portal-grade layouts and custom provider composition.

Base Account is also a generic wallet entry now:

```tsx
import { AomiFrame, AomiWalletKitProvider } from "@aomi-labs/widget-lib";
import { base } from "wagmi/chains";

export function Assistant() {
  return (
    <AomiWalletKitProvider
      wallets={{
        evm: {
          chains: [base],
          wallets: ["baseAccount"],
          coinbase: false,
          appName: "Aomi",
        },
        solana: false,
      }}
      execution={{
        aa: "optional",
        sponsorship: {
          mode: "optional",
          paymasterServiceUrl: "/api/paymaster",
        },
      }}
    >
      <AomiFrame height="640px" width="100%" />
    </AomiWalletKitProvider>
  );
}
```

`AomiBaseAccountProvider` remains as a deprecated compatibility wrapper, but new integrations should use `AomiWalletKitProvider`.

### AomiFrame props

| Prop             | Type                           | Default                                       | Description                         |
| ---------------- | ------------------------------ | --------------------------------------------- | ----------------------------------- |
| `width`          | `CSSProperties["width"]`       | `"100%"`                                      | Container width                     |
| `height`         | `CSSProperties["height"]`      | `"80vh"`                                      | Container height                    |
| `className`      | `string`                       | -                                             | Additional CSS classes              |
| `style`          | `CSSProperties`                | -                                             | Inline styles                       |
| `walletPosition` | `"header" \| "footer" \| null` | `"footer"`                                    | Where to show wallet connect button |
| `backendUrl`     | `string`                       | `NEXT_PUBLIC_BACKEND_URL` or `localhost:8080` | Backend API URL                     |

### Compound components

```tsx
import { AomiFrame } from "@aomi-labs/widget-lib";

<AomiFrame.Root height="600px" backendUrl="https://api.example.com">
  <AomiFrame.Header
    withControl={true}
    controlBarProps={{ hideWallet: true, hideApiKey: true }}
  />
  <AomiFrame.Composer />
</AomiFrame.Root>;
```

### ControlBar

`ControlBar` provides model selection, app selection, API key input, and wallet connection.

```tsx
import { ControlBar } from "@aomi-labs/widget-lib/control-bar";

<ControlBar hideModel hideApiKey />;
```

| Prop         | Type        | Default | Description                |
| ------------ | ----------- | ------- | -------------------------- |
| `className`  | `string`    | -       | Additional CSS classes     |
| `children`   | `ReactNode` | -       | Custom controls to render  |
| `hideModel`  | `boolean`   | `false` | Hide model selector        |
| `hideApp`    | `boolean`   | `false` | Hide app/agent selector    |
| `hideApiKey` | `boolean`   | `false` | Hide API key input         |
| `hideWallet` | `boolean`   | `false` | Hide wallet connect button |

Individual pieces (`ModelSelect`, `AppSelect`, `ApiKeyInput`, `ConnectButton`) are also exported from `@aomi-labs/widget-lib/control-bar` for fully custom layouts.

---

## Headless runtime: `@aomi-labs/react`

The headless runtime is the engine under `<AomiWidget />` and `<AomiFrame />`. Use it directly when you want your own UI.

It manages:

- **Concurrent threads** — create, switch, rename, archive, and delete chat threads; each thread has its own message history, model, namespace, and processing state.
- **Backend orchestration** — polling and SSE through `/api/thread/chat`, `/api/thread/state`, `/api/thread/interrupt`, `/api/thread/updates`, and `/api/threads/*`.
- **Per-thread control state** — selected model, selected namespace/agent, dirty flag, `isProcessing` — all scoped per thread.
- **Wallet request handler** — `useWalletHandler()` subscribes to inbound wallet transaction requests and routes signed results back to the backend.
- **User + event contexts** — wallet state auto-syncs via `onUserStateChange`, system events flow through a typed event buffer.

### Mount the runtime

```tsx
import { ThreadContextProvider, AomiRuntimeProvider } from "@aomi-labs/react";

export function App({ children }) {
  return (
    <ThreadContextProvider>
      <AomiRuntimeProvider
        backendUrl="https://chat.aomi.dev"
        clientOptions={{ credentials: "include" }}
      >
        {children}
      </AomiRuntimeProvider>
    </ThreadContextProvider>
  );
}
```

### useAomiRuntime

Programmatic control over threads, messages, and user state.

```tsx
import { useAomiRuntime } from "@aomi-labs/react";

function MyComponent() {
  const {
    currentThreadId,
    createThread,
    selectThread,
    deleteThread,
    sendMessage,
    getMessages,
    isRunning,
    user,
    setUser,
  } = useAomiRuntime();

  return <button onClick={() => sendMessage("Hello!")}>Send</button>;
}
```

### useControl

Model, namespace, and API key state — persisted to `localStorage` where appropriate.

```tsx
import { useControl } from "@aomi-labs/react";

function Controls() {
  const {
    state, // { namespace, apiKey, availableModels, authorizedNamespaces, ... }
    onModelSelect,
    onNamespaceSelect,
    setApiKey,
  } = useControl();

  return <div>Namespace: {state.namespace}</div>;
}
```

### useWalletHandler

Subscribe to inbound wallet transaction requests surfaced by the backend.

```tsx
import { useWalletHandler } from "@aomi-labs/react";

useWalletHandler({
  onTxRequest: async (req) => {
    const hash = await mySigner.sendTransaction(req.payload);
    return { txHash: hash };
  },
});
```

---

## TypeScript client: `@aomi-labs/client`

Platform-agnostic client for Node.js and browsers. No React, no UI.

```ts
import { AomiClient, Session } from "@aomi-labs/client";

// Low-level: direct HTTP/SSE access
const client = new AomiClient({ baseUrl: "https://api.aomi.dev" });
await client.createThread(crypto.randomUUID());

// High-level: polls, dispatches events, manages wallet requests
const session = new Session(client, { namespace: "default" });
const result = await session.send("Swap 1 ETH for USDC on Uniswap");

session.on("wallet_tx_request", async (req) => {
  const signed = await mySigner.signTransaction(req.payload);
  await session.resolve(req.id, { txHash: signed.hash });
});
```

See [`packages/client/README.md`](packages/client/README.md) for the full `Session` API.

---

## CLI: `aomi`

The `aomi` CLI lets you chat with Aomi agents and sign on-chain transactions directly from your terminal. Installing `@aomi-labs/client` globally exposes the `aomi` binary.

```bash
npm install -g @aomi-labs/client
aomi --version
```

### Two entry shapes

```bash
# Interactive REPL (reuses active session)
aomi

# One-shot prompt
aomi --prompt "what is the price of ETH?"

# Noun-verb subcommands for durable workflows
aomi chat "swap 1 ETH for USDC" --public-key 0xYourAddress --chain 1
aomi tx list
aomi tx simulate tx-1 tx-2
aomi tx sign tx-1 tx-2 --private-key 0xYourPrivateKey --rpc-url https://eth.llamarpc.com
aomi session list|new|resume|delete|status|log|events|close
aomi model list|set|current
aomi app list|current
aomi chain list
aomi secret add NAME=value
```

### Example: swap with account abstraction

```bash
export ALCHEMY_API_KEY=your-alchemy-key
export ALCHEMY_GAS_POLICY_ID=your-gas-policy-id
export PRIVATE_KEY=0xYourPrivateKey

aomi chat "swap 100 USDC for ETH" --public-key 0xYourAddress --chain 1
aomi tx sign tx-1    # auto-detects AA, tries 7702 then 4337, errors if both fail
```

### AA execution model

| AA configured? | Flag                          | Result                                                        |
| -------------- | ----------------------------- | ------------------------------------------------------------- |
| Yes            | (none)                        | AA automatically (preferred mode → alternative mode fallback) |
| Yes            | `--aa-provider` / `--aa-mode` | AA with explicit settings                                     |
| Yes            | `--eoa`                       | EOA, skip AA                                                  |
| No             | (none)                        | EOA                                                           |
| No             | `--aa-provider`               | Error: AA requires provider credentials                       |

There is **no silent EOA fallback** — if AA is selected and both modes fail, the CLI returns a hard error suggesting `--eoa`. Supported providers: **Alchemy** (4337 sponsored + 7702) and **Pimlico** (4337 sponsored).

### Batch simulation

`aomi tx simulate` runs pending transactions sequentially on a forked chain so state-dependent flows (approve → swap) are validated as a batch. Returns per-step success, revert reasons, and gas usage without modifying on-chain state.

See [`packages/client/skills/aomi-transact/SKILL.md`](packages/client/skills/aomi-transact/SKILL.md) for the complete CLI reference.

---

## Agent skill: `aomi-transact`

`aomi-transact` is an agent skill that teaches an AI assistant (Claude, Codex, etc.) to drive the Aomi CLI — inspect sessions, build wallet requests, simulate batches, sign with AA or EOA, switch apps and chains, and ingest per-session secrets.

Install via the skills registry:

```bash
npx skills add aomi-labs/skills
```

The skill file lives at [`packages/client/skills/aomi-transact/SKILL.md`](packages/client/skills/aomi-transact/SKILL.md) and includes:

- Hard rules for handling private keys and API keys safely.
- The default chat → review → simulate → sign workflow.
- Full command, flag, and environment variable reference.
- AA provider and mode selection guidance per chain.
- Integrated-app catalog (Binance, Bybit, CoW, DefiLlama, Dune, dYdX, GMX, Hyperliquid, Kaito, Kalshi, Khalani, LI.FI, Manifold, Morpho, Neynar, OKX, 1inch, Polymarket, X, Yearn, 0x, and more).
- Troubleshooting for RPC, simulation, and AA failures.

A companion skill, `aomi-build`, scaffolds new backend apps from OpenAPI specs, REST endpoints, or SDK examples.

---

## FAQ

### What can an Aomi agent actually do?

Answer questions about crypto, DeFi, markets, wallets, and on-chain state — and, when authorized, queue real wallet transactions (swaps, transfers, approvals, cross-chain intents, prediction-market bets, perps orders) that the user or CLI signs.

### Do I need a wallet to use Aomi?

No. In the widget, chat works without any wallet provider and wallet actions stay disabled. In the CLI, read-only flows (prices, balances, quotes) work without a private key.

### Is Aomi hosted or self-hosted?

The packages in this repo are client libraries. The complete widget points its required `apiUrl` at an **Aomi Portal/BFF** such as `https://chat.aomi.dev`; Portal owns browser auth and relays backend traffic. The headless runtime can point `backendUrl` at an Aomi-compatible API directly. The CLI uses `AOMI_BACKEND_URL` / `--backend-url` and defaults to the hosted Portal.

### What's the difference between `@aomi-labs/react` and `@aomi-labs/widget-lib`?

- `@aomi-labs/react` — headless runtime, contexts, and hooks. No UI.
- `@aomi-labs/widget-lib` — the complete `AomiWidget`, plus advanced UI components (`AomiFrame`, `ControlBar`, etc.) built on top of the runtime.

Install `@aomi-labs/widget-lib` for the default experience; it already depends on the runtime. Install only `@aomi-labs/react` if you're building a custom UI.

### When should I use the CLI vs. the widget?

- **Widget / runtime** — when a human user will connect a wallet in the browser and sign requests themselves.
- **CLI** — when you (the developer) want to script or run on-chain flows from your terminal with a local private key, or when an AI agent should drive Aomi as a tool.

### Which chains and AA modes are supported?

Ethereum, Polygon, Arbitrum, Base, Optimism, and Sepolia. AA uses EIP-4337 (bundler + paymaster) or EIP-7702 (native delegation). Default mode is 7702 on Ethereum, 4337 on L2s.

### Does it support streaming and tool calls?

Yes. The runtime streams assistant messages and dispatches tool calls and system events — including wallet transaction requests — through a typed event bus.

### How does an AI agent use Aomi?

Install the `aomi-transact` skill. The agent then uses the `aomi` CLI as a tool, following the skill's workflow rules for session management, simulation, and signing. No custom integration code needed.

---

## Requirements

- **React:** 18 or 19 (widget and runtime)
- **Node:** 18+ (CLI and client)
- **Framework:** any modern React toolchain; Next.js and Vite are verified
- **CSS:** import `@aomi-labs/widget-lib/styles.css`; no Tailwind setup is required for package consumers
- **Portal/BFF:** an Aomi Portal origin reachable over HTTP/SSE with the consumer origin trusted
- **Auth:** optional Para publishable key or Privy app id; omit `auth` for external-wallet/SIWE mode
- **Optional for CLI AA:** `ALCHEMY_API_KEY` and/or `PIMLICO_API_KEY`

## Development

This is a pnpm monorepo.

```bash
pnpm install
pnpm run build:lib            # Build the widget/runtime library
pnpm run build:client         # Build the TypeScript client + CLI
pnpm --filter landing dev     # Run Landing (typically localhost:3001 beside Portal)
pnpm run dev:landing:live     # Watch library + demo together
pnpm lint                     # Lint check
pnpm test                     # Run tests
```

### Repo layout

```
packages/
  react/       # @aomi-labs/react — headless runtime, contexts, hooks
  client/      # @aomi-labs/client — TypeScript client + `aomi` CLI + skills
apps/
  shadcn-registry/ # @aomi-labs/widget-lib — package + shadcn-installable UI
  portal/          # BetterAuth/account/BFF host (localhost:3000)
  landing/         # Next.js consumer/demo (localhost:3001)
  widget-consumer/ # Minimal Vite Para + providerless consumer
```

## Environment variables

Package widget consumer:

```
NEXT_PUBLIC_AOMI_PORTAL_URL=https://chat.aomi.dev
NEXT_PUBLIC_PARA_API_KEY=your_para_publishable_key
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_reown_project_id
```

Portal must list each cross-origin consumer in `AOMI_TRUSTED_ORIGINS` and hold
the matching server-only Para/Privy verifier credentials. See
[`apps/portal/LOCAL_ENV.example`](apps/portal/LOCAL_ENV.example).

CLI (optional):

```
AOMI_BACKEND_URL=https://api.aomi.dev
AOMI_API_KEY=...
PRIVATE_KEY=0x...
CHAIN_RPC_URL=https://eth.llamarpc.com
ALCHEMY_API_KEY=...
ALCHEMY_GAS_POLICY_ID=...
PIMLICO_API_KEY=...
AOMI_STATE_DIR=~/.aomi
```

Get your Reown Project ID from [Reown](https://docs.reown.com/).

## License

MIT
