Runtime test coverage

Purpose
- Validates the refactored runtime against legacy behavior: UI/runtime separation, thread lifecycle, and concurrent polling semantics.
- Exercises core flows without hitting the real backend by stubbing the API client.

Test files
- runtime-thread-list.test.tsx: thread list fetch, ordering, archived buckets, placeholder filtering.
- runtime-thread-creation.test.tsx: temp thread creation/mapping, queued messages, system message ordering.
- runtime-thread-mutations.test.tsx: rename/archive/unarchive rollback, delete flow, default thread fallback.
- runtime-orchestrator.test.tsx: optimistic message protection during inbound sync.
- runtime-polling.test.tsx: polling start/stop, session expiry, background polling, cancel interrupts.
- runtime-sse.test.tsx: title updates for backend and temp threads, placeholder title filtering.

How it works
- runtime-test-utils.tsx provides a mocked BackendApi, harness components, and helpers to render the runtime and orchestrator.
- Each suite configures backend behavior via setBackendApiConfig and resets it per test.

Run locally
- pnpm test -- --run packages/react/src/runtime/__tests__
- pnpm test -- --run packages/react/src/runtime/__tests__/runtime-thread-creation.test.tsx
