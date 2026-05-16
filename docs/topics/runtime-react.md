---
title: Runtime React
owner: frontend
status: authoritative
area: runtime-react
review_after_days: 30
sources_of_truth:
  - packages/react/src/runtime/aomi-runtime.tsx
  - packages/react/src/runtime/core.tsx
  - packages/react/src/interface.tsx
  - packages/react/src/contexts/control-context.tsx
  - packages/react/src/contexts/thread-context.tsx
---

# Runtime React

`@aomi-labs/react` is the headless runtime that coordinates thread state, backend IO, wallet requests, and control state for the widget and custom UIs.

## Provider Shell

- `AomiRuntimeProvider` constructs `AomiClient`, then wraps children with thread, notification, user, control, and event providers.
- `AomiRuntimeInner` binds the current thread id and current user identity into the control and event contexts.
- Consumers access the unified runtime surface through `useAomiRuntime()`.

## Core Responsibilities

- `AomiRuntimeCore` owns the orchestrator, thread lifecycle, backend thread materialization, and wallet request routing.
- Thread metadata and message state are exposed as a single runtime API rather than separate low-level stores.
- The runtime warms and creates backend sessions lazily, usually on first message send.

## Operational Flows

- The runtime reads current app, API key, client id, and user state before each send.
- Incoming backend events are dispatched through the event context and then into hooks such as `useWalletHandler`.
- Runtime methods such as `sendMessage`, `cancelGeneration`, `createThread`, and `renameThread` are exposed through the interface context.

## Related Topics

- [widget-frame.md](widget-frame.md)
- [ts-client.md](ts-client.md)
- [auth-adapter.md](auth-adapter.md)
