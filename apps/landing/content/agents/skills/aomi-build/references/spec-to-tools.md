# Spec To Tools

Use this when the input is an OpenAPI document, Swagger spec, Postman collection, endpoint list, or product brief.

It also applies when the "spec" is really one of these:

- SDK docs that link out to source repos
- runtime / RPC documentation
- example applications
- architecture notes with concrete commands, configs, and method names

## Extract First

Before writing code, pull out:

- base URL and authentication scheme
- the actual integration target the finished app should call
- main entities and identifiers
- read operations vs write operations
- pagination, filters, and search parameters
- user-specific inputs the host must provide
- confirmation or safety requirements
- rate limits, async jobs, and polling behavior
- common error shapes
- whether the docs actually publish an end-user API or mainly document a builder workflow

If a detail is missing, do not invent it. Leave a TODO or ask for the smallest missing piece.

## Find The Real Integration Target

Prefer the nearest executable product surface over explanatory documentation.

Ask these questions early:

- What will the finished app actually call?
- Is there a concrete service contract such as REST, GraphQL, JSON-RPC, gRPC, webhook delivery, or a stable CLI protocol?
- Is the target hosted, self-hosted, customer-provided, or only available through a local example stack?
- If the source is an SDK or example project, does it expose a service that clients use after the builder sets it up?

Useful rule of thumb:

- If users can point the app at a running thing, build the client for that thing.
- If no running thing exists yet, only then consider a builder or reference assistant.

## Decide The App Type Early

Choose one of these before naming tools:

- **Product client**: the source exposes a real callable product surface, even if it is self-hosted or example-backed.
- **Execution assistant**: the docs expose quote/build/submit flows and host or wallet handoff matters.
- **Builder assistant**: the docs mostly explain how to build on top of a network, SDK, or runtime.

Builder assistants are valid outcomes, but they are the fallback, not the default. If the docs mostly point to SDK repos and example stacks, first check whether those repos produce a runnable interface that the app can call.

## Map Endpoints To Model-Facing Tools

Do not default to one tool per endpoint. Instead, group endpoints by user intent.

Before implementation, write down the proposed toolset explicitly:

- tool name
- what the user would ask for that should trigger it
- key inputs
- key outputs
- whether it reads, prepares, or writes
- whether it depends on a live target, wallet, signer, or host callback

Treat this as a required checkpoint. If the proposed toolset is weak, too docs-oriented, too endpoint-shaped, or not clearly tied to user intent, revise it before writing code.

When choosing the first implementation:

- optimize for the primary user workflow first
- keep the toolset as small as possible while still making that workflow work end to end
- prefer app-specific high-value actions over broad protocol coverage when the source makes the important workflow obvious
- avoid schema or discovery tools unless they are needed to support the chosen workflow
- only mirror the wider API surface if the user asked for broad coverage

Good mappings:

- several lookup endpoints -> `search_*` or `get_*`
- multiple list and detail calls -> `resolve_*` then `get_*`
- quote + build + submit endpoints -> `get_*_quote`, `build_*`, `submit_*`
- create side effects -> preview/build first, then explicit submit after confirmation
- standard runtime interfaces -> wrap the standard methods first, then add extension hooks or custom methods
- SDK + example repo + config + RPC docs -> `list_*_resources`, `get_*_overview`, `get_*_quickstart`, `get_*_rpc_surface`, `get_*_defaults`
- example-backed transactional app -> one health/connectivity tool, a few read tools for key state, one write tool for the main action, and one verification tool for the outcome

Less useful mappings:

- raw REST verbs as tool names
- exposing every transport detail directly to the model
- returning unnormalized upstream payloads when only 20 percent of the fields matter
- choosing a docs-summary tool surface when a real client could be built instead
- inventing public user actions that are not actually documented by the source
- building a large first-pass toolset before proving the primary user workflow

## Preamble Rubric

A strong preamble usually includes:

- `## Role`
- `## Capabilities`
- `## Workflow`
- `## Rules`

For execution apps, spell out:

- when confirmation is required
- which tool comes first
- which tool hands off to the wallet or host
- what must be preserved exactly between steps

## Output Shape Rubric

Return the minimum stable JSON the model needs for the next step.

Good result shapes often include:

- a top-level echo of the key input
- normalized identifiers
- concise summaries
- arrays of candidate objects
- `requires_selection`, `selection_reason`, or `next_step_hint` when ambiguity remains
- `SYSTEM_NEXT_ACTION` when the host must take over

Avoid:

- leaking auth credentials
- giant raw payloads
- mixed naming conventions from multiple upstream APIs
- claiming success before the final submit step succeeds

## Suggested Build Loop

1. Read the spec and summarize the app contract.
2. Identify the concrete service or runtime target.
3. Propose the tool surface in concrete user-facing terms.
4. Scaffold or patch `lib.rs`, `client.rs`, and `tool.rs`.
5. Normalize auth, models, and errors in `client.rs`.
6. Implement small, strongly typed tools.
7. Build and test.
8. If the target is available, verify a short end-to-end scenario:
   - connectivity
   - key read
   - key write when applicable
   - post-write verification
9. Update docs or examples if the repo includes them.

If the app is brand new in `aomi-sdk`, remember that `cargo run -p xtask -- build-aomi --app <name>` may skip an untracked app. A direct `cargo build --manifest-path apps/<name>/Cargo.toml` is the fastest compile check until the manifest is tracked.
