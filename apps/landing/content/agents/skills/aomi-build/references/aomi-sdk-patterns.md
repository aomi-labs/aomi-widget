# Aomi SDK Patterns

These patterns come from the SDK example and the inspected public apps in `aomi-sdk`.

## Canonical Layout

Use this split unless there is a strong reason not to:

```text
apps/my-app/
├─ Cargo.toml
└─ src/
   ├─ lib.rs
   ├─ client.rs
   └─ tool.rs
```

- `lib.rs`: manifest, preamble, `dyn_aomi_app!`
- `client.rs`: app struct, HTTP client, auth, models, helpers
- `tool.rs`: `DynAomiTool` impls and user-facing tool surface

## Minimal Manifest Shape

```rust
use aomi_sdk::*;

mod client;
mod tool;

const PREAMBLE: &str = r#"## Role
You are ...
"#;

dyn_aomi_app!(
    app = client::MyApp,
    name = "my-app",
    version = "0.1.0",
    preamble = PREAMBLE,
    tools = [
        client::SearchThing,
        client::GetThing,
    ]
);
```

Keep `lib.rs` small. The manifest should be easy to audit at a glance.

## What The Real Apps Show

### `sdk/examples/app-template-http`

Use as the default baseline for read-only HTTP APIs.

- Simple `reqwest::blocking` client
- Clean typed args
- Small tool surface
- Straightforward JSON normalization

### `apps/x`

Use this pattern when the upstream API:

- needs an env-backed API key
- has a wrapper response envelope
- benefits from normalized data models and formatting helpers

Notable conventions:

- auth env vars live in `client.rs`
- logical API failures are normalized before reaching tools
- tools return concise, model-friendly JSON

### `apps/polymarket`

Use this pattern when the app needs:

- multiple upstream API surfaces
- dynamic preamble context such as exact current date
- intent resolution before execution
- multi-step flows with explicit user confirmation

Notable conventions:

- preamble explains exact flow order
- tool surface separates search, details, intent resolution, preview, and submit
- results include next-step hints without hiding uncertainty

### `apps/khalani`

Use this pattern when execution must hand off to host wallet tools.

Notable conventions:

- app tools never send the wallet request directly
- build tools return `SYSTEM_NEXT_ACTION`
- preamble tells the model to preserve exact host args and continue after wallet callbacks

### Executable product integrations

When the source material is mostly SDK docs, example repos, runtime notes, or architecture docs, first check whether it exposes or produces a client-facing interface such as:

- REST or GraphQL
- JSON-RPC
- gRPC
- webhooks
- a stable CLI request/response contract
- a local example service or reference node

If such a surface exists:

- build the app against that executable interface
- treat the SDK, example repo, and docs as implementation references
- expose user-useful operations against the real service, not just summaries of the docs
- validate with at least one real call when possible

### Builder-oriented fallbacks

Use a builder-oriented shape only when the source material is mostly:

- SDK documentation
- example repositories
- architecture notes
- runtime / RPC references
- config files and quickstarts

In that case:

- do not pretend there is a public swap, quote, or portfolio API unless the source really documents one
- do not hide the absence of a real integration target
- prefer tools such as `list_*_resources`, `get_*_overview`, `get_*_quickstart`, `get_*_rpc_surface`, or `get_*_network_defaults`
- make the preamble explicit that the app is a builder assistant, not an end-user trading agent
- say clearly what would be needed to upgrade the app into a real client later, such as a base URL, running example service, or customer endpoint

## Tool Authoring Checklist

Every tool should answer these:

- What user intent does it serve?
- What exact name should the model call?
- What fields does the model need to provide?
- What result shape will be easiest for the model to reason over?
- If the upstream API is inconsistent, where will normalization happen?

Prefer names like:

- `search_*`
- `get_*`
- `list_*`
- `resolve_*`
- `build_*`
- `submit_*`

## Client Conventions

Keep these in `client.rs` whenever possible:

- base URLs
- auth headers
- shared request helpers
- response envelopes
- normalization helpers
- typed upstream models

Prefer short actionable errors such as:

- `X_API_KEY environment variable not set`
- `Gamma API error 404: ...`
- `Failed to parse markets: ...`

## Validation Commands

Inside `aomi-sdk`, the repo documents these as the standard loop:

```bash
cargo run -p xtask -- new-app my-app
cargo run -p xtask -- build-aomi --app my-app
```

One caveat from practice:

- `xtask build-aomi` currently prefers tracked `apps/*/Cargo.toml` files via `git ls-files`
- a brand new untracked app can therefore compile fine but still be skipped by `build-aomi`
- use `cargo build --manifest-path apps/my-app/Cargo.toml` for an immediate compile check before the new app is tracked

For focused logic tests, use the SDK test helpers:

```rust
use aomi_sdk::testing::{TestCtxBuilder, run_tool};
```

Use `run_async_tool` only when the tool is actually async.
