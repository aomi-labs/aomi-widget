---
title: TypeScript Client
owner: sdk
status: authoritative
area: ts-client
review_after_days: 30
sources_of_truth:
  - packages/client/src/client.ts
  - packages/client/src/session.ts
  - packages/client/src/sse.ts
  - packages/client/src/types.ts
  - packages/client/src/index.ts
---

# TypeScript Client

`@aomi-labs/client` is the transport and type layer shared by the widget runtime, CLI, and external consumers.

## Main Surface

- `AomiClient` wraps the backend HTTP and SSE APIs behind a single class.
- The client normalizes API URL construction, session headers, API-key headers, and common fetch error handling.
- Shared types for chat, state, threads, system events, simulation, and wallet results live in `packages/client/src/types.ts`.

## Request Families

- Chat and session state methods target `/api/chat`, `/api/state`, `/api/system`, and `/api/interrupt`.
- Session management methods create, list, rename, archive, and delete backend threads.
- SSE support is factored into its own subscriber helper so UI consumers and CLI flows can share the same event model.

## Cross-Package Role

- `@aomi-labs/react` depends on this package for runtime transport.
- The `aomi` CLI also depends on this package rather than maintaining a separate backend client.
- This package is the stable boundary when consumers want Aomi backend access without React or widget UI concerns.

## Related Topics

- [runtime-react.md](runtime-react.md)
- [cli.md](cli.md)
