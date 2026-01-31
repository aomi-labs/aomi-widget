# Aomi Widget

AI assistant + onchain widget library for React applications.

## Installation

```bash
pnpm install @aomi-labs/react
```

Or install via shadcn registry:

```bash
npx shadcn add https://widget.aomi.dev/r/aomi-frame.json
```

## Quick Start

Drop the frame into your app with zero configuration:

```tsx
import { AomiFrame } from "@aomi-labs/react";

export function Assistant() {
  return <AomiFrame height="640px" width="100%" />;
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

### Compound Components (Advanced)

For full customization, use the compound component API:

```tsx
import { AomiFrame } from "@aomi-labs/react";

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

The root container that provides all necessary contexts.

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
  WalletConnect,
} from "@aomi-labs/react";

// Custom layout
<div className="flex gap-2">
  <ModelSelect placeholder="Choose model" />
  <NamespaceSelect placeholder="Choose agent" />
  <ApiKeyInput title="API Key" description="Enter your key" />
  <WalletConnect connectLabel="Connect" />
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

#### WalletConnect Props

| Prop                 | Type                           | Default            | Description                   |
| -------------------- | ------------------------------ | ------------------ | ----------------------------- |
| `className`          | `string`                       | -                  | Additional CSS classes        |
| `connectLabel`       | `string`                       | `"Connect Wallet"` | Button text when disconnected |
| `onConnectionChange` | `(connected: boolean) => void` | -                  | Callback on connection change |

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

## License

MIT
