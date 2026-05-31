---
title: Auth Adapter
owner: frontend
status: authoritative
area: auth
review_after_days: 30
sources_of_truth:
  - apps/registry/src/lib/aomi-auth-adapter/context.tsx
  - packages/react/src/runtime/user-state-provider.tsx
  - apps/registry/src/lib/aomi-auth-adapter/providers/base-account.tsx
  - apps/registry/src/lib/aomi-auth-adapter/providers/para.tsx
  - apps/registry/src/lib/aomi-auth-adapter/types.ts
---

# Auth Adapter

The auth adapter layer bridges host-specific wallet or account providers into the runtime’s normalized `UserState`.

## Core Behavior

- `AomiAuthRuntimeUserSync` reads the active adapter identity and mirrors it into `useUser()` state from `@aomi-labs/react`.
- The bridge carries EVM address, optional Solana address, chain id, smart-account mode, and provider labels.
- Adapter metadata is also copied into `user_state.ext` keys such as `wallet_provider` and `login_method`.

## Why It Exists

- Host apps can authenticate through different providers without rewriting runtime internals.
- The runtime needs one normalized user model even when the host provider exposes separate EVM and SVM identities.
- Smart-account and login-method metadata need to survive the jump from host adapter code into backend-facing runtime state.

## Current Surface

- Registry-side adapters live under `apps/registry/src/lib/aomi-auth-adapter/`.
- Provider-specific implementations currently include Para and Base Account integration surfaces.

## Related Topics

- [apps/facts/widget-frame.md](../../apps/facts/widget-frame.md)
- [client-runtime/facts/react-runtime.md](../../client-runtime/facts/react-runtime.md)
- [auth/facts/auth.md](auth.md)
