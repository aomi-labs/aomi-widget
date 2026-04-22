# Aomi Widget

**Aomi Widget is an open-source React component library that adds an AI chat assistant with built-in onchain wallet actions to any web app.** It ships as a drop-in `<AomiFrame />` component plus headless hooks, and is designed for teams building AI-powered crypto, DeFi, and web3 products.

- **Package:** `@aomi-labs/react` (runtime) and `@aomi-labs/widget-lib` (UI via shadcn registry)
- **Stack:** React 19, Next.js 15, TypeScript, Tailwind CSS 4, Radix UI, `@assistant-ui/react`
- **License:** MIT

## What is Aomi Widget?

Aomi Widget is a React chat widget for AI assistants that can read wallet state and request onchain transactions. It combines three pieces:

1. **A chat UI** — threads, streaming messages, tool calls, markdown, and a composer.
2. **A runtime** — backend polling/SSE, thread management, model/namespace selection, and system events.
3. **A wallet bridge** — provider-agnostic adapter that plugs into Para, wagmi, or your own auth stack.

If you want an AI assistant that can talk about *and* act on onchain data inside your app, this is what you embed.

## Key features

- **Drop-in React component** — one `<AomiFrame />` tag renders the full chat, sidebar, and composer.
- **Works without a wallet** — chat UI still functions; wallet actions disable gracefully.
- **Provider-agnostic auth** — use Para + wagmi (recommended), or wire your own adapter.
- **Headless hooks** — `useAomiRuntime` and `useControl` for fully custom UIs.
- **Compound components** — `AomiFrame.Root` / `.Header` / `.Composer` for custom layouts.
- **shadcn registry install** — copy source into your repo for full customization.
- **Per-thread model & namespace state** — each conversation remembers its settings.
- **Streaming, tool calls, and system events** — backed by `@assistant-ui/react` primitives.

## When should I use Aomi Widget?

| Use case | Fit |
| --- | --- |
| Embed an AI assistant in a DeFi, wallet, or onchain app | **Primary** |
| Add onchain tool-calling to an existing AI product | **Primary** |
| Build a chat UI with no wallet/web3 needs | Works, but lighter alternatives exist |
| Replace your entire AI backend | Out of scope — Aomi Widget is the frontend + runtime; pair it with an Aomi-compatible backend |

## Installation

Install the npm packages:

```bash
pnpm install @aomi-labs/react @aomi-labs/widget-lib
```

Or copy source into your project via the shadcn registry:

```bash
npx shadcn add https://aomi.dev/r/aomi-frame.json
```

The registry install includes the provider-agnostic **Aomi auth adapter** primitives. To enable wallet UX, render the widget inside your Para + wagmi provider tree (see the landing example).

## Quick start

Drop the frame into your app. Without wallet providers, chat still works and wallet actions stay disabled.

```tsx
import { AomiFrame } from "@aomi-labs/widget-lib";

export function Assistant() {
  return <AomiFrame height="640px" width="100%" />;
}
```

### With wallet providers

Wrap the frame in Para + React Query to enable wallet connection and transaction requests:

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

## Requirements

- **React:** 18 or 19
- **Next.js:** 14+ (or any React framework that supports client components)
- **Node:** 18+
- **Tailwind CSS:** v4
- **Backend:** an Aomi-compatible backend reachable via `NEXT_PUBLIC_BACKEND_URL` (default `http://localhost:8080`)
- **Optional for wallet UX:** `@getpara/react-sdk`, `wagmi`, `@tanstack/react-query`

## AomiFrame component

### Default layout

The default layout includes a sidebar with thread list, a header with controls, and a message composer:

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

### Props

| Prop             | Type                           | Default                                       | Description                         |
| ---------------- | ------------------------------ | --------------------------------------------- | ----------------------------------- |
| `width`          | `CSSProperties["width"]`       | `"100%"`                                      | Container width                     |
| `height`         | `CSSProperties["height"]`      | `"80vh"`                                      | Container height                    |
| `className`      | `string`                       | -                                             | Additional CSS classes              |
| `style`          | `CSSProperties`                | -                                             | Inline styles                       |
| `walletPosition` | `"header" \| "footer" \| null` | `"footer"`                                    | Where to show wallet connect button |
| `backendUrl`     | `string`                       | `NEXT_PUBLIC_BACKEND_URL` or `localhost:8080` | Backend API URL                     |

Wallet behavior is read from the surrounding Para + wagmi provider tree. Without one, the frame still renders and wallet UI stays disabled.

### Compound components (advanced)

Use the compound API for custom layouts:

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

Root container providing layout, runtime providers, and transaction bridge.

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

Header with sidebar trigger, control bar, and thread title.

| Prop              | Type              | Default | Description                   |
| ----------------- | ----------------- | ------- | ----------------------------- |
| `children`        | `ReactNode`       | -       | Additional elements to render |
| `withControl`     | `boolean`         | `true`  | Show the control bar          |
| `controlBarProps` | `ControlBarProps` | -       | Props passed to ControlBar    |
| `className`       | `string`          | -       | Additional CSS classes        |

#### AomiFrame.Composer

Main content area with messages and input composer.

| Prop              | Type              | Default | Description                     |
| ----------------- | ----------------- | ------- | ------------------------------- |
| `children`        | `ReactNode`       | -       | Additional elements to render   |
| `withControl`     | `boolean`         | `false` | Show control bar above messages |
| `controlBarProps` | `ControlBarProps` | -       | Props passed to ControlBar      |
| `className`       | `string`          | -       | Additional CSS classes          |

## ControlBar component

ControlBar provides model selection, namespace/agent selection, API key input, and wallet connection.

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

### ControlBar props

| Prop            | Type        | Default | Description                   |
| --------------- | ----------- | ------- | ----------------------------- |
| `className`     | `string`    | -       | Additional CSS classes        |
| `children`      | `ReactNode` | -       | Custom controls to render     |
| `hideModel`     | `boolean`   | `false` | Hide model selector           |
| `hideNamespace` | `boolean`   | `false` | Hide namespace/agent selector |
| `hideApiKey`    | `boolean`   | `false` | Hide API key input            |
| `hideWallet`    | `boolean`   | `false` | Hide wallet connect button    |

### Individual control components

Compose a fully custom control bar:

```tsx
import {
  ModelSelect,
  NamespaceSelect,
  ApiKeyInput,
  ConnectButton,
} from "@aomi-labs/widget-lib/control-bar";

<div className="flex gap-2">
  <ModelSelect placeholder="Choose model" />
  <NamespaceSelect placeholder="Choose agent" />
  <ApiKeyInput title="API Key" description="Enter your key" />
  <ConnectButton connectLabel="Connect" />
</div>;
```

#### ModelSelect props

| Prop          | Type     | Default          | Description            |
| ------------- | -------- | ---------------- | ---------------------- |
| `className`   | `string` | -                | Additional CSS classes |
| `placeholder` | `string` | `"Select model"` | Placeholder text       |

#### NamespaceSelect props

| Prop          | Type     | Default          | Description            |
| ------------- | -------- | ---------------- | ---------------------- |
| `className`   | `string` | -                | Additional CSS classes |
| `placeholder` | `string` | `"Select agent"` | Placeholder text       |

#### ApiKeyInput props

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

Programmatic control over threads, messages, and user state.

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

Access control state (model, namespace, API key).

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

## FAQ

### Do I need a wallet to use Aomi Widget?

No. Chat works without any wallet provider. Wallet actions simply stay disabled until you wrap the frame in a Para + wagmi provider tree (or your own Aomi auth adapter).

### Which wallet providers are supported?

The widget ships a provider-agnostic **Aomi auth adapter**. The reference integration uses **Para** for auth plus **wagmi** for chain interactions, but any stack can implement the adapter interface.

### Can I customize the UI?

Yes, three levels:

1. Pass props to `<AomiFrame />`.
2. Compose `AomiFrame.Root` / `.Header` / `.Composer` and individual ControlBar parts.
3. Install via shadcn registry (`npx shadcn add ...`) to get source files in your repo and edit them directly.

### Is this a hosted service or self-hosted?

The widget is a client library. It talks to an **Aomi-compatible backend** that you point at via `NEXT_PUBLIC_BACKEND_URL`. You can run that backend yourself or use a hosted Aomi endpoint.

### What framework does it require?

React 18 or 19. It's designed for Next.js but works in any React framework that supports client components and Tailwind CSS v4.

### Does it support streaming and tool calls?

Yes. The runtime streams assistant messages and dispatches tool calls and system events (including wallet transaction requests) through a typed event bus.

### What's the difference between `@aomi-labs/react` and `@aomi-labs/widget-lib`?

- `@aomi-labs/react` — runtime, contexts, and hooks.
- `@aomi-labs/widget-lib` — prebuilt UI components (AomiFrame, ControlBar, etc.).

Install both for the default experience, or use the shadcn registry to copy UI source into your repo.

## Development

```bash
pnpm install
pnpm run build:lib            # Build the library
pnpm --filter landing dev     # Run demo at localhost:3000
pnpm run dev:landing:live     # Watch library + demo together
pnpm lint                     # Lint check
pnpm test                     # Run tests
```

## Environment variables

Create a `.env` file:

```
NEXT_PUBLIC_PROJECT_ID=your_reown_project_id
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
```

Get your Project ID from [Reown](https://docs.reown.com/).

## License

MIT
