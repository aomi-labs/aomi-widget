# aomi-smither PoC log — from "what do you wanna build?" to a live app

**Date:** 2026-07-05 · **Branch:** `feat/deployment-sdk-guardrails` · **App built:** `geckoterminal` (DeFi liquidity-pool analytics) · **Backend:** `api-staging.aomi.dev`, platform `community`

Every snippet below is real output captured from the session — agent text, engine
events, generated code, and backend responses. Nothing is mocked.

---

## 0. The premise

`aomi-smither` composes a durable [Smithers](https://smithers.sh) workflow **on
the fly from user intent**: an intake chat distills a typed `BuildPlan`, and the
plan renders into a JSX task graph — GitHub-fresh SDK binaries, deterministic
Rust codegen, agent curation, a validate/repair loop, and a gated deploy. Every
completed task persists to SQLite; a completed task is never re-executed.

## 1. Intent chat (the TUI wizard)

```
Aomi Smither
smither: What Aomi App do you wanna build? Tell me about the product or API —
I'll compose the workflow (spec source, agents, validation, smoke, deploy) from
your answers.
you: i wanna make a app that manages morpho pools
thinking…
```

Two findings from this first human session:

- A **React-duplication crash** on first launch (`@inkjs/ui` declares no react
  dependency at all; its bare import fell through to pnpm's hoisted `react@19.2.3`
  while Ink's reconciler was bound to `19.2.7`). Fixed with a root
  `pnpm.packageExtensions` granting `@inkjs/ui` a react peer.
- **Morpho has no public OpenAPI** — its API is GraphQL. `aomi-build`'s own
  discovery confirmed it:

```
  postman: no match
Error: no spec found for `morpho` from any source.
Otherwise, draft one from docs via the `aomi-app-client-api-gen` skill in Claude Code
```

So the PoC pivoted to a real DeFi-pools API with a published spec:
**GeckoTerminal API V2** (OpenAPI 3.0.1, 20 endpoints — trending pools, pool
search, OHLCV, trades). The composed plan, exactly as the preview/dry-run showed:

```
Plan:
  app: geckoterminal
  sdk: /Users/cecilia/Code/aomi-sdk (synced from GitHub)
  source: existing spec: apps/geckoterminal/openapi.yaml
  story: Track and analyze DeFi liquidity pools: find trending pools, inspect a
         pool's price, volume, and recent trades across networks
  builder: claude
  fix rounds: 2
Workflow:
  · Sync SDK from GitHub, build aomi binaries [compute] (geckoterminal:binaries)
  · aomi-build gen-client + gen-tool from existing spec [compute] (geckoterminal:codegen)
  · Curate tools with claude [agent] (geckoterminal:curate)
  · Validate, repair with claude (up to 2 rounds) [loop] (geckoterminal:validate-loop)
  · Summarize run [compute] (geckoterminal:result)
```

## 2. Stage: GitHub-fresh binaries (and the gate doing its job)

The first attempt was **correctly refused** — the SDK checkout had drifted:

```
✗ geckoterminal:binaries: "SDK checkout is 1 commit(s) behind origin/main with
uncommitted changes. aomi-smither builds binaries from a GitHub-fresh SDK
checkout; fix the checkout at /Users/cecilia/Code/aomi-sdk or pass
--allow-stale-sdk to override."
```

(The "uncommitted changes" were untracked files — including the engine's own
`.smithers/` state — so the gate was tightened to tracked modifications only:
`git status --porcelain --untracked-files=no`.) After the fix, the stage synced
and recorded its output row:

```json
{ "node_id": "geckoterminal:binaries",
  "source": "fresh-cargo-build",
  "head_sha": "f60ffff7e3cb3cde224bf2dc1ecbbf1ed0f989d6",
  "sync_action": "up-to-date", "warning": "" }
```

`f60ffff` is `origin/main`'s HEAD — binaries built from exactly what GitHub has.

## 3. Stage: codegen (real spec, real spec problems)

GeckoTerminal's published swagger is subtly broken — 14 `include` query
parameters carry `examples` but no `schema`, which the SDK's OpenAPI parser
rejects:

```
✗ geckoterminal:codegen: "aomi-build codegen failed: Error: gen-client failed
Caused by:
   0: spec is not valid YAML
   1: paths: no variant of enum ParameterSchemaOrContent found in flattened data
      at line 1404 column 3"
```

A sanitized copy (each bad parameter given `schema: {type: string}`) went to
`apps/geckoterminal/openapi.yaml`, and codegen produced the client:

```
✓ wrote /Users/cecilia/Code/aomi-sdk/apps/geckoterminal/Cargo.toml
✓ wrote /Users/cecilia/Code/aomi-sdk/apps/geckoterminal/src/lib.rs
✓ wrote /Users/cecilia/Code/aomi-sdk/apps/geckoterminal/src/tool.rs (14 tools)
✓ added `apps/geckoterminal` to workspace exclude list
```

Result: `src/client/client.rs` — **6,647 lines, all 20 API methods** — plus 14
mechanical tool stubs.

## 4. Stage: agent curation (Claude, inside the Smithers task)

The curate task runs Claude Code non-interactively in the SDK checkout, with
Smithers owning retries and the structured-output contract. Claude's actual
persisted output row (`curation` table, verbatim):

> Curated the geckoterminal app from 14 mechanical gen-tool stubs into 10
> user-centric tools for the story 'track and analyze DeFi liquidity pools'.
> The rewrite adds the endpoints the stubs missed that matter most for this
> story — trending pools (global + per-network with 5m/1h/6h/24h windows), top
> pools by network/DEX with volume/transaction ranking, and OHLCV price history
> — **and fixes two stub bugs: the client was constructed with the spec's
> relative base URL '/api/v2' (now https://api.geckoterminal.com/api/v2) and
> the trades stub passed an API key into the 'token' query param while
> referencing an out-of-scope ctx (the API is fully public; no auth anywhere
> now).** New tools: geckoterminal_list_networks, get_trending_pools,
> get_top_pools, get_new_pools, search_pools, get_pool (single/multi composite
> that branches to the multi endpoint on comma-separated addresses),
> get_pool_ohlcv (USD candles, timeframe+aggregate validated against the enum),
> get_pool_trades (…) Dropped as separate tools: tokens/multi (covered by
> get_token_price), token info / pool info metadata endpoints and
> info_recently_updated (socials/description metadata, off-story). Rewrote the
> PREAMBLE with capabilities, network-slug/JSON:API/string-number conventions,
> rate-limit note, and search→pool-address workflow guidance. Seeded test.json
> with a Base trending→pool-deep-dive user story. **Verified: cargo build clean
> (no warnings) and a live curl of the exact trending-pools request shape
> returns valid data.** Edits scoped entirely to apps/geckoterminal.

```
changedFiles: apps/geckoterminal/src/tool.rs (rewritten: 14 stubs → 10 curated tools),
              apps/geckoterminal/src/lib.rs (new PREAMBLE + tool registration),
              apps/geckoterminal/test.json (new e2e seed)
followUps:    Run /aomi-app-e2e-tester geckoterminal … Note the public API rate
              limit (~30 calls/min) if e2e runs make many calls.
```

Real curated code — the agent-facing preamble it wrote in `src/lib.rs`:

```rust
const PREAMBLE: &str = r##"## Role
You are an AI assistant specialized in GeckoTerminal, the on-chain DEX analytics
platform. You help users track and analyze DeFi liquidity pools across 200+
networks: discover trending and top pools, and inspect any pool's price, volume,
liquidity, and recent trades. This is a read-only data surface — no trading or
wallet actions.

## Capabilities
- **Trending pools** — `geckoterminal_get_trending_pools` for what's hot right
  now, globally or on one network, over a 5m/1h/6h/24h window.
- **Top pools** — `geckoterminal_get_top_pools` for the biggest pools on a
  network (optionally a single DEX), ranked by 24h volume or transactions. …
```

…and one of the ten curated tools in `src/tool.rs`:

```rust
impl DynAomiTool for GetTrendingPools {
    type App = GeckoterminalApp;
    type Args = GetTrendingPoolsArgs;
    const NAME: &'static str = "geckoterminal_get_trending_pools";
    const DESCRIPTION: &'static str = "Use when the user asks what's trending or
      hot right now. Returns the currently trending DEX pools — across all
      networks, or on one network — with price, 24h volume, liquidity, and
      price-change stats. Duration picks the trending window (5m/1h/6h/24h).";

    fn run(_app: &GeckoterminalApp, args: Self::Args, _ctx: DynToolCallCtx)
        -> Result<Value, String> {
        let runtime = rt()?;
        runtime.block_on(async move {
            match args.network.as_deref() {
                Some(network) => {
                    let duration: GetnetworksNetworkTrendingpoolsDuration = args
                        .duration.as_deref().unwrap_or("24h").parse()
                        .map_err(|_| invalid_duration(…))?;
                    let resp = client()
                        .getnetworks_network_trendingpools(
                            network, Some(duration), Some(POOL_INCLUDE), None, args.page)
                        .await
                        .map_err(|e| format!("[geckoterminal] trending pools: {e}"))?
                        .into_inner();
                    ok(resp)
                } …
```

## 5. Stage: validate loop

`cargo fmt` → `clippy -Dwarnings` → `test --no-run`, with up to 2 agent repair
rounds budgeted. **Zero were needed** — the persisted validation row:

```json
{ "node_id": "geckoterminal:validate", "green": 1,
  "log": "Compiling geckoterminal v0.1.0 (/Users/cecilia/Code/aomi-sdk/apps/geckoterminal)
          Finished `test` profile [unoptimized + debuginfo] target(s) in 2.03s" }
```

```
✓ geckoterminal:curate
▸ geckoterminal:validate
✓ geckoterminal:validate
▸ geckoterminal:result
✓ geckoterminal:result
run finished
```

## 6. Live smoke — the app answers from real market data

`aomi-build compile` produced `plugins/geckoterminal.dylib` (16.6 MB), then:

```
$ aomi-run plugins/geckoterminal.dylib --prompt "What are the top 3 trending
  pools right now? Give each pool's name and 24h volume."

### 🥈 2. TCC / WBNB
- **Network & DEX:** BNB Chain · PancakeSwap V2
- **24h Volume:** $53.25M
- **24h Price Change:** +47,879.72% 🔥 *(newly launched)*

### 🥉 3. ANSEM / SOL *(Meteora pool)*
- **Network & DEX:** Solana · Meteora
- **24h Volume:** $24.65M

**Notable mentions:**
- 🔵 **OpenAI / USDC** (Base · Uniswap V4) — a staggering **$147.4M** in 24h volume
  [tokens: in=27143 out=416 total=27559]
```

## 7. Durability proof (the reason Smithers is here at all)

Engine-level e2e: run the same workflow twice against the same state.

```
prepared run smither-e2edemo-… (resume=false)  → run status: finished
second prepare: resume=true, sameRunId=true
resume status: finished; commands re-executed: 0
E2E OK: fresh run finished, resume executed zero commands
```

## 8. Stage: deploy (ship it)

Deploying taught the workflow three real lessons, each now encoded in it:

1. **A monorepo-generated app is not a deployable unit.** `aomi-build deploy`
   requires a *pushed GitHub commit* with a tracked `aomi.toml`, from a repo
   bound to a platform via the GitHub App. The app was exported to
   `ceciliaz030/my-aomi-bots` (branch `smither/geckoterminal-poc`), its
   `Cargo.toml` rewritten from the monorepo path-dep to the published crate —
   and it compiled clean against crates.io `aomi-sdk 3.0.1` on the first try.
   The workflow gained `--deploy-path` / `--deploy-aomi-toml` /
   `--deploy-platform` for exactly this shape, plus a codegen idempotence guard
   so a deploy re-run **keeps curated sources** instead of clobbering them.
2. **Activation tokens are admin-minted and platform-scoped.** The saved
   `somm.finance` token 403'd on other platforms; the staging admin key minted
   a fresh platform token (`aomi-build token mint --platform community
   --admin-kid aomi-admin-staging-1` → token id 137). The unbound app-scoped
   variant hit a backend DB constraint (`platform_activation_tokens_scope_shape`)
   — a real backend bug surfaced by the PoC.
3. **Source repos are 1:1 bound to platforms.** `ceciliaz030/my-aomi-bots` is
   `app_source id 1`, bound to platform `community` (hosted repo
   `aomi-labs/community-apps`, deploy branch `publish`) — krexa 403'd with
   "app source is bound to a different platform". The backend also enforces the
   SDK pin repo-wide: `aomi-build sdk fix` bumped the repo from 3.0.0 to the
   backend-required **3.0.1**.

Preflight, for real:

```json
{ "ok": true, "deployment": {
    "id": "dep_141779906_r229e1090c5_cb7227310237",
    "status": "preflight",
    "source": { "repository_link": "ceciliaz030/my-aomi-bots",
                "commit_hash": "cb72273102379de8834961777402b29b82f3307c",
                "aomi_toml_paths": ["apps/geckoterminal/aomi.toml"] },
    "platform": { "platform": "community",
                  "repository": "aomi-labs/community-apps",
                  "deploy_branch": "publish",
                  "apps": [{ "name": "geckoterminal",
                             "release_tag": "apps-141779906-r229e1090c5-geckoterminal-cb7227310237",
                             "target": "x86_64-unknown-linux-gnu" }] } } }
```

Then the smither deploy run itself — codegen skipping to protect the curation:

```
starting run smither-geckoterminal-c96df6ef-… (state: …/geckoterminal/smithers.sqlite)
▸ geckoterminal:binaries
✓ geckoterminal:binaries
▸ geckoterminal:codegen        ← "kept existing generated + curated sources"
✓ geckoterminal:codegen
▸ geckoterminal:validate
✓ geckoterminal:validate
▸ geckoterminal:deploy
```

_Deploy outcome: see §9 — appended when the backend finished._

## 9. Deploy outcome — live

The deploy task's persisted output (verbatim, from the `deployment` table):

```
Preflight passed for platform `community`.
  source_commit : cb72273102379de8834961777402b29b82f3307c
  - geckoterminal -> apps-141779906-r229e1090c5-geckoterminal-cb7227310237
Deployment started.
  id            : dep_141779906_r229e1090c5_cb7227310237
  pr            : https://github.com/aomi-labs/community-apps/pull/84
Waiting for release readiness...
  build         : building
  build         : github_checks_pending
  build         : ready
Release is ready.
{ "ok": true, "activation": { "status": "activating", "platform": "community",
  "promoted": [{ "name": "geckoterminal",
    "release_tag": "apps-141779906-r229e1090c5-geckoterminal-cb7227310237",
    "activated_commit_hash": "acba23940a53284d40593497ea18f37ee5037fc2",
    "ci_status": "passed", … }] } }
```

The engine's view — the deploy stage inside the same durable run:

```
▸ geckoterminal:deploy
✓ geckoterminal:deploy      ← PR → CI ("Build candidate release: pass") → activate
▸ geckoterminal:result
✓ geckoterminal:result
run finished
```

And the backend's final word (`aomi-build status`):

```
Deployment status
  platform      : community
  deployment_id : dep_141779906_r229e1090c5_cb7227310237
  local state   : deployed=true activated=true
  backend       : https://api-staging.aomi.dev
  deploy state  : ready
  - geckoterminal (apps-141779906-r229e1090c5-geckoterminal-cb7227310237)
      local     : activated=true
      backend   : active=true artifact_ready=true loaded
```

**`active=true artifact_ready=true loaded`** — the smither-built app is live on
the staging backend's community platform. Full loop closed: a sentence of
intent → composed Smithers workflow → generated + agent-curated + validated
Rust app → answering live market data locally → shipped, promoted, and loaded
by the hosted platform.

---

## 10. Overnight session: the three skipped agents, live on the console

The first E2E only exercised one LLM agent (curate). This session ran the other
three — intent-chat, reviewer, repairer — with the branded browser console
recording each. Screenshots: `smither-fe-*.png` delivered alongside this log.

### 10.1 Intent-chat agent (`distillIntent`)

TUI session (pty capture — the same greeting/chat you drove for morpho):

```
Aomi Smither
smither: What Aomi App do you wanna build? Tell me about the product or API —
I'll compose the workflow (spec source, agents, validation, smoke, deploy)…
> an app for tracking defi liquidity pools across chains - trending pools,
  prices, volumes and recent trades
thinking…
```

The agent's actual distillation (verbatim JSON — note it discovered the
existing app and proposed reuse):

```json
{
  "summary": "Build a DeFi liquidity pool tracker app covering trending pools, prices, volumes, and recent trades across chains — this maps to GeckoTerminal, which already exists at apps/geckoterminal with an openapi.yaml.",
  "plan": { "app": "geckoterminal", "source": "existing",
            "userStory": "Track DeFi liquidity pools across chains: surface trending pools, pool prices, trading volumes, and recent trades",
            "builder": "claude" },
  "questions": [
    "apps/geckoterminal already exists with a spec — rebuild/refresh it, or did you want a brand-new app under a different name?",
    "Should I add a review pass and a local smoke test after the build?"
  ],
  "ready": true
}
```

### 10.2 Reviewer agent (codex) — and it REJECTED the curation

Run: `--review --reviewer codex`. To make the repair loop fire deterministically,
a type error was deliberately planted in a `#[cfg(test)]` module of
`src/client/mod.rs` (invisible to `cargo build`, fatal to `cargo test`).
Fun fact: the first planting went into `tool.rs` and the **curate agent
erased it by rewriting the file wholesale** — the sabotage had to move to a
file the curator never touches.

Codex's persisted review (`approved: 0` — it found real API-correctness gaps):

> The curated surface mostly covers the primary story, but **I would not
> approve it as-is.** Concrete issues: tool.rs:450-494 defines
> geckoterminal_get_pool_ohlcv **without the API's `token` parameter** and then
> passes token=None… if the user's target asset is the quote token, the
> chart/trend is inverted or simply the wrong side of the pool; it also lacks
> before_timestamp… tool.rs:511-539 has the same omission for
> geckoterminal_get_pool_trades: the API supports token='base'/'quote'/address
> to invert trade perspective… Recent trades can therefore report buy/sell
> direction and amounts from the wrong token perspective.

(Screenshot `smither-fe-2`: activity feed full of `geckoterminal:review`
heartbeats/agent events while codex worked.)

### 10.3 Repair agent (claude) — validate red → fix → validate green

The `validation` table shows the loop across iterations of the same node:

```
iteration 0  green: 0   error[E0308]: mismatched types --> src/client/mod.rs:16
iteration 1  green: 1   Finished `test` profile … Executable unittests src/lib.rs
```

The fix agent's persisted summary (verbatim):

> Fixed the E0308 type mismatch in apps/geckoterminal/src/client/mod.rs:16 —
> the base_url_is_absolute smoke test annotated the URL string literal as f64
> and called is_finite() on it. Changed the binding to &str and replaced the
> assertion with url.starts_with("https://") so the test actually verifies the
> base URL is absolute. cargo test in apps/geckoterminal now compiles and the
> single test passes (1 passed; 0 failed).

It didn't delete the broken test — it repaired it into a meaningful one.
(Screenshots `smither-fe-3`/`smither-fe-4`: the validate/repair rail running,
then every stage green, run `finished`.)

### 10.4 What the live session fixed in the console itself

- **Frame envelope bug**: the gateway streams engine events double-nested
  (`{event:"run.event", payload:{event:"node.started", payload:{nodeId…}}}`);
  the UI reducers expected flat frames, so the stage rail stayed "pending"
  forever. Fixed with `unwrapFrame` (+ heartbeat/agent-activity ⇒ "running"
  fallback for events older than the gateway's replay window); 51 tests green.
- **`fork` is incompatible with CLI agents** in smithers-orchestrator 0.26.1:
  ClaudeCodeAgent/CodexAgent persist no session snapshot, so review/fix forking
  the curate session died with "no usable agent session snapshot" (and retried
  infinitely — maxAttempts=infinite). Removed `fork` from both tasks; their
  prompts are self-sufficient. Worth an upstream issue.
- The gateway caches a UI bundle per entry path for the process lifetime —
  live-editing the console mid-run needs a fresh observer process
  (`aomi-smither console --app <name> --port <n>`), which is also how the
  fix-agent screenshots were taken.

### Agent census after this session

Every LLM seat in the composed workflow has now run for real: intent-chat
(claude, read-only), curate (claude, 4 runs), review (codex, 1 run — rejected),
fix (claude, 1 round — repaired), plus the deterministic engine around them.

---

## Appendix: what the PoC changed in smither itself

Every failure above became a durable improvement:

| Live failure | Fix in smither |
| --- | --- |
| TUI crash (duplicate React) | `pnpm.packageExtensions` react peer for `@inkjs/ui` |
| Freshness gate blocked by untracked files | tracked-only dirty check |
| Process hangs after run (engine timers) | explicit exits in CLI + headless |
| Deploy re-run would clobber curated code | codegen idempotence guard |
| Monorepo app ≠ deployable unit | `--deploy-path` / `--deploy-aomi-toml` / `--deploy-platform` |
| No progress visibility | thinking-ticker, streamed command tail, browser console sidecar (Smithers Gateway) |

And the open items it surfaced beyond smither: a **draft-spec agent stage** for
platforms without OpenAPI (morpho's case, and even gecko's spec needed
sanitizing), the backend's unbound-app-token constraint bug, and
config-over-manifest platform resolution in `aomi-build deploy`.
