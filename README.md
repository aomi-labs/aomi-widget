# Aomi

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![npm version](https://img.shields.io/npm/v/@aomi-labs/widget-lib.svg)](https://www.npmjs.com/package/@aomi-labs/widget-lib)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

> Open-source AI blockchain infrastructure for executing on-chain transactions. One-line install.

## What is Aomi?

Aomi is open-source AI blockchain infrastructure for executing on-chain transactions. This repo provides `AomiFrame` — a drop-in React widget that gives your app an AI assistant capable of natural-language chat, wallet connection, transaction simulation, and on-chain execution. Installs in one line via npm or the shadcn registry.

## Supported Chains

Aomi currently supports EVM-compatible chains. Chain-agnostic support is on the roadmap.

## Use Cases

- **DeFi dApps** — embed a chat-based swap, lend, or borrow assistant so users transact in plain English without touching menus.
- **Wallet dashboards and portfolio tools** — add an AI co-pilot that explains balances, proposes rebalances, and executes the moves.
- **Developer portals** — give developers a natural-language interface to manage API keys, wallets, and test flows without navigating a settings UI.
- **Prediction markets** — let users chat through research, order placement, and position management (Polymarket, Kalshi, and more via plugins).
- **GameFi companions** — drop in an AI buddy that handles token transfers, rewards claims, and on-chain actions for players.

## Installation

```bash
pnpm install @aomi-labs/react @aomi-labs/widget-lib
```

Or install via shadcn registry:

```bash
npx shadcn add https://aomi.dev/r/aomi-frame.json
```

The registry install includes provider-agnostic Aomi auth adapter primitives.
To enable wallet UX, render the widget inside your Para + wagmi provider tree,
as shown in the landing example.

## Quick Start

Drop the frame into your app with zero configuration. Without wallet providers,
the chat UI still works and wallet actions remain disabled.

```tsx
import { AomiFrame } from "@aomi-labs/widget-lib";

export function Assistant() {
  return <AomiFrame height="640px" width="100%" />;
}
```

Wrap the frame in your wallet providers when needed:

```tsx
import "@getpara/react-sdk/styles.css";
import { Environment, ParaProvider } from "@getpara/react-sdk";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AomiFrame } from "@aomi-labs/widget-lib";

const queryClient = new QueryClient();

export function Assistant() {
  return (
    <QueryClientProvider client={queryClient}>
      <ParaProvider
        paraClientConfig={{
          apiKey: process.env.NEXT_PUBLIC_PARA_API_KEY!,
          env: Environment.BETA,
        }}
      >
        <AomiFrame height="640px" width="100%" />
      </ParaProvider>
    </QueryClientProvider>
  );
}
```

## AomiFrame Component

### Simple Usage (Default Layout)

The default layout includes a sidebar with thread list, header with controls, and message composer:

```tsx
import { AomiFrame } from "@aomi-labs/react";

// Basic usage
<AomiFrame />

// With custom dimensions
<AomiFrame width="800px" height="600px" />

// With custom backend URL
<AomiFrame backendUrl="https://api.example.com" />

// Wallet button in header instead of footer
<AomiFrame walletPosition="header" />

// Hide wallet button entirely
<AomiFrame walletPosition={null} />
```

### Props Reference

| Prop             | Type                           | Default                                       | Description                         |
| ---------------- | ------------------------------ | --------------------------------------------- | ----------------------------------- |
| `width`          | `CSSProperties["width"]`       | `"100%"`                                      | Container width                     |
| `height`         | `CSSProperties["height"]`      | `"80vh"`                                      | Container height                    |
| `className`      | `string`                       | -                                             | Additional CSS classes              |
| `style`          | `CSSProperties`                | -                                             | Inline styles                       |
| `walletPosition` | `"header" \| "footer" \| null` | `"footer"`                                    | Where to show wallet connect button |
| `backendUrl`     | `string`                       | `NEXT_PUBLIC_BACKEND_URL` or `localhost:8080` | Backend API URL                     |

Wallet behavior comes from the surrounding Para + wagmi provider tree. If you
do not provide one, the frame renders and the wallet UI stays disabled.

### Compound Components (Advanced)

For full customization, use the compound component API:

```tsx
import { AomiFrame } from "@aomi-labs/widget-lib";

export function CustomAssistant() {
  return (
    <AomiFrame.Root height="600px" backendUrl="https://api.example.com">
      <AomiFrame.Header
        withControl={true}
        controlBarProps={{ hideWallet: true, hideApiKey: true }}
      />
      <AomiFrame.Composer />
    </AomiFrame.Root>
  );
}
```

#### AomiFrame.Root

The root container that provides the widget layout, runtime providers, and
transaction bridge. Wallet behavior is read from the surrounding Para + wagmi
provider tree when present.

| Prop             | Type                           | Default                 | Description                       |
| ---------------- | ------------------------------ | ----------------------- | --------------------------------- |
| `children`       | `ReactNode`                    | -                       | Header and Composer components    |
| `width`          | `CSSProperties["width"]`       | `"100%"`                | Container width                   |
| `height`         | `CSSProperties["height"]`      | `"80vh"`                | Container height                  |
| `className`      | `string`                       | -                       | Additional CSS classes            |
| `style`          | `CSSProperties`                | -                       | Inline styles                     |
| `walletPosition` | `"header" \| "footer" \| null` | `"footer"`              | Wallet button position in sidebar |
| `backendUrl`     | `string`                       | env or `localhost:8080` | Backend API URL                   |

#### AomiFrame.Header

The header with sidebar trigger, control bar, and thread title.

| Prop              | Type              | Default | Description                   |
| ----------------- | ----------------- | ------- | ----------------------------- |
| `children`        | `ReactNode`       | -       | Additional elements to render |
| `withControl`     | `boolean`         | `true`  | Show the control bar          |
| `controlBarProps` | `ControlBarProps` | -       | Props passed to ControlBar    |
| `className`       | `string`          | -       | Additional CSS classes        |

#### AomiFrame.Composer

The main content area with messages and input composer.

| Prop              | Type              | Default | Description                     |
| ----------------- | ----------------- | ------- | ------------------------------- |
| `children`        | `ReactNode`       | -       | Additional elements to render   |
| `withControl`     | `boolean`         | `false` | Show control bar above messages |
| `controlBarProps` | `ControlBarProps` | -       | Props passed to ControlBar      |
| `className`       | `string`          | -       | Additional CSS classes          |

## ControlBar Component

The ControlBar provides model selection, namespace/agent selection, API key input, and wallet connection.

```tsx
import { ControlBar } from "@aomi-labs/react";

// Full control bar
<ControlBar />

// Hide specific controls
<ControlBar hideModel hideApiKey />

// Add custom controls
<ControlBar hideWallet>
  <MyCustomButton />
</ControlBar>
```

### ControlBar Props

| Prop            | Type        | Default | Description                   |
| --------------- | ----------- | ------- | ----------------------------- |
| `className`     | `string`    | -       | Additional CSS classes        |
| `children`      | `ReactNode` | -       | Custom controls to render     |
| `hideModel`     | `boolean`   | `false` | Hide model selector           |
| `hideNamespace` | `boolean`   | `false` | Hide namespace/agent selector |
| `hideApiKey`    | `boolean`   | `false` | Hide API key input            |
| `hideWallet`    | `boolean`   | `false` | Hide wallet connect button    |

### Individual Control Components

Use individual components for granular control:

```tsx
import {
  ModelSelect,
  NamespaceSelect,
  ApiKeyInput,
  ConnectButton,
} from "@aomi-labs/widget-lib/control-bar";

// Custom layout
<div className="flex gap-2">
  <ModelSelect placeholder="Choose model" />
  <NamespaceSelect placeholder="Choose agent" />
  <ApiKeyInput title="API Key" description="Enter your key" />
  <ConnectButton connectLabel="Connect" />
</div>;
```

#### ModelSelect Props

| Prop          | Type     | Default          | Description            |
| ------------- | -------- | ---------------- | ---------------------- |
| `className`   | `string` | -                | Additional CSS classes |
| `placeholder` | `string` | `"Select model"` | Placeholder text       |

#### NamespaceSelect Props

| Prop          | Type     | Default          | Description            |
| ------------- | -------- | ---------------- | ---------------------- |
| `className`   | `string` | -                | Additional CSS classes |
| `placeholder` | `string` | `"Select agent"` | Placeholder text       |

#### ApiKeyInput Props

| Prop          | Type     | Default                   | Description            |
| ------------- | -------- | ------------------------- | ---------------------- |
| `className`   | `string` | -                         | Additional CSS classes |
| `title`       | `string` | `"Aomi API Key"`          | Dialog title           |
| `description` | `string` | `"Enter your API key..."` | Dialog description     |

#### ConnectButton props

| Prop                 | Type                           | Default             | Description                   |
| -------------------- | ------------------------------ | ------------------- | ----------------------------- |
| `className`          | `string`                       | -                   | Additional CSS classes        |
| `connectLabel`       | `string`                       | `"Connect Account"` | Button text when disconnected |
| `onConnectionChange` | `(connected: boolean) => void` | -                   | Callback on connection change |

## Hooks

### useAomiRuntime

Access the runtime API for programmatic control:

```tsx
import { useAomiRuntime } from "@aomi-labs/react";

function MyComponent() {
  const {
    // Thread management
    currentThreadId,
    createThread,
    selectThread,
    deleteThread,

    // Messages
    sendMessage,
    getMessages,
    isRunning,

    // User state
    user,
    setUser,
  } = useAomiRuntime();

  return <button onClick={() => sendMessage("Hello!")}>Send</button>;
}
```

### useControl

Access control state (model, namespace, API key):

```tsx
import { useControl } from "@aomi-labs/react";

function MyComponent() {
  const {
    state, // { namespace, apiKey, availableModels, authorizedNamespaces }
    setState, // Update namespace or apiKey
    getAvailableModels,
    getAuthorizedNamespaces,
    onModelSelect, // Select a model (backend-only)
  } = useControl();

  return <div>Current namespace: {state.namespace}</div>;
}
```

## Development

```bash
pnpm install
pnpm run build:lib            # Build the library
pnpm --filter landing dev     # Run demo at localhost:3000
pnpm run dev:landing:live     # Watch library + demo together
pnpm lint                     # Lint check
pnpm test                     # Run tests
```

## Environment Variables

Create `.env` with:

```
NEXT_PUBLIC_PROJECT_ID=your_reown_project_id
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
```

Get your Project ID from [Reown](https://docs.reown.com/).

## FAQ

**Is Aomi open-source?**
Yes. MIT licensed. The widget, plugin SDK, and agent skills are all open-source — you can inspect, fork, or extend any layer.

**Does Aomi take custody of my keys?**
No. Aomi plans the transaction and hands it back to your wallet for local signing. The widget never has access to private keys.

**Which chains does Aomi support?**
EVM-compatible chains today, including Ethereum, Arbitrum, Base, Optimism, and Polygon. Chain-agnostic support is on the roadmap.

**How does Aomi compare to LangChain or the Vercel AI SDK?**
LangChain and the AI SDK are general-purpose frameworks that require you to build blockchain integrations manually. Aomi is purpose-built for crypto — native multi-chain support, real-time transaction simulation, wallet integration, and a Rust backend tuned for agentic crypto workloads.

**Can I use `<AomiFrame />` without wallet providers?**
Yes. The widget renders and chat works standalone; wallet actions stay disabled until you wrap the frame in your Para + wagmi provider tree.

**Does the agent hallucinate bad transactions?**
Every AI-generated action can be simulated before execution. You see exact token changes and gas costs before signing — the AI suggests, you verify, you decide.

**How do I add a new protocol or API integration?**
Build a plugin with [aomi-sdk](https://github.com/aomi-labs/aomi-sdk). The Aomi runtime hot-loads new plugins as they're published.

## License

MIT
