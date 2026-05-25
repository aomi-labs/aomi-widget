---
title: Repo Wiki Topics
owner: platform
status: authoritative
area: repowiki
review_after_days: 30
sources_of_truth:
  - repowiki.toml
  - docs/topics
  - scripts/repowiki
---

# Repo Wiki Topics

These topic pages are the maintained knowledge surface for `aomi-widget`. They are organized around operational questions and package responsibilities rather than raw folder listings.

Use `./scripts/repowiki list` to enumerate topics and `./scripts/repowiki look <topic>` to open one directly. Topic command handling comes from the neighboring `product-mono` Rust `repowiki` binary; this repo owns the wrapper, config, docs surface, and the local `./aomi` link that lets generated inventories reuse the shared Rust workspace metadata.

## Core Packages

- [repo-overview.md](repo-overview.md): monorepo shape, package boundaries, and common build flows
- [widget-frame.md](widget-frame.md): `@aomi-labs/widget-lib` composition and UI surface
- [runtime-react.md](runtime-react.md): `@aomi-labs/react` provider shell, thread runtime, and event flow
- [ts-client.md](ts-client.md): `@aomi-labs/client` HTTP, SSE, and shared API types
- [cli.md](cli.md): `aomi` CLI entrypoint and command structure

## Integration Surfaces

- [auth-adapter.md](auth-adapter.md): auth-provider bridge from host wallets into runtime `UserState`
- [demo-apps.md](demo-apps.md): landing, base, portal, and telegram validation surfaces

## Supporting References

- [../index.md](../index.md): repo wiki entrypoint and policy
- [../../specs/DOMAIN.md](../../specs/DOMAIN.md): architecture rules and flows
- [../../specs/METADATA.md](../../specs/METADATA.md): package and environment metadata
