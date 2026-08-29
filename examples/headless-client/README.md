# Headless TypeScript client

This is one deliberately small integration example for the canonical Agent and
Pipeline APIs. It demonstrates:

1. Automatic Better Auth guest authentication without treating its opaque
   session token as an OAuth bearer.
2. Two Agent turns sharing one opaque session ID.
3. Reading the ordered Event stream through `ClientSession`.
4. Keeping Actions at an explicit host-owned review boundary.
5. Optionally building and simulating a Pipeline operation without committing.

Run it against a local Portal/BFF:

```bash
AOMI_BASE_URL=http://127.0.0.1:3000 pnpm example:headless-client
```

To exercise a real catalog operation, provide its live arguments:

```bash
AOMI_BASE_URL=http://127.0.0.1:3000 \
AOMI_PIPELINE_APP=aave \
AOMI_PIPELINE_OPERATION=supply \
AOMI_PIPELINE_ARGS='{"asset":"USDC","amount":"100"}' \
pnpm example:headless-client
```

The example intentionally has no wallet implementation. If the runtime emits
an Action, it prints the complete request and rejects it. A host that wants to
execute must provide explicit `ActionCapabilities`, show its own review UI,
and call `run.session.actions.execute(action.id)`. Configuring a capability
never authorizes automatic execution.

Private keys, provider credentials, continuation metadata, and authoritative
transaction state do not belong in this example or in `UserState`.
