---
title: CLI
owner: sdk
status: authoritative
area: client-runtime
review_after_days: 30
sources_of_truth:
  - packages/client/package.json
  - packages/client/src/cli/main.ts
  - packages/client/src/cli/root.ts
  - packages/client/src/cli/repl.ts
  - packages/client/src/cli/commands/chat.ts
---

# CLI

The `aomi` terminal client is published from `@aomi-labs/client` and shares its transport layer with the widget runtime.

## Entrypoint

- `packages/client/package.json` exposes the `aomi` bin as `./dist/cli.js`.
- `packages/client/src/cli/main.ts` decides whether to run root help, one-shot commands, or the interactive REPL.
- Root command handling is defined under `packages/client/src/cli/root.ts`.

## Command Surface

- The CLI supports chat, transaction, session, model, app, chain, wallet, config, and secret commands.
- Transaction commands include `tx list`, `tx simulate <id>...`, `tx export <id>...`, and `tx sign <id>...`.
- `tx export` refreshes authoritative pending state and emits only an EIP-5792 `wallet_sendCalls` version `2.0.0` parameter object to stdout. It accepts EVM transaction calls on one sender and chain; it never signs, broadcasts, injects the execution-time service-fee call, or reports completion to the backend.
- Interactive mode exposes slash-style helpers such as `/app`, `/model`, and `/key`.
- The root help path is intentionally explicit about backend URL, API key, app, model, chain, and wallet options.

## Role In The Repo

- The CLI is the terminal-facing consumer of the same backend contracts used by the runtime and widget.
- Packaging it inside `@aomi-labs/client` keeps the command surface and transport layer versioned together.

## Related Topics

- [client-runtime/facts/transport-client.md](../../client-runtime/facts/transport-client.md)
- [development/facts/workspace.md](../../development/facts/workspace.md)
