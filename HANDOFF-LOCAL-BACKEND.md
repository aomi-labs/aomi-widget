# Handoff — Local backend + bff-unification dev stack

> Written 2026-06-29. Purpose: let another agent (or future-you) bring up and keep
> running the full local stack that proves the **bff-unification** account-auth
> against the real **product-mono `origin/main`** backend, then continue the merge
> work. Everything here is **local dev only** — no production writes.

## 0. The goal (where this is heading)

Create a **new branch on the aomi frontend** that merges:

- `codex/widget-auth-pre-rust` — arixon's pre-Rust BetterAuth/SIWE/account work
  (the branch this file is on). **Do not lose its changes.**
- `bff-unification` (Cecilia) — the shipped, canonical BFF account-auth, built on
  top of the pre-rust branch. It has handoff docs addressed to arixon:
  `aomi-bff-unification/docs/handoffs/arixoneth-account-auth.md` +
  `bff-betterauth-integration.md`. Read those for the merge plan (GAP-1/2/3).

This file is **only** the local-environment context (backend, DB, how to run).
The merge itself is the next task.

## 1. Repos & locations (sibling dirs under `Work.nosync/`)

| Path | What | Branch | Notes |
|---|---|---|---|
| `aomi/` | Frontend / widget-lib (this repo). Package name `aomi-widget`. | `codex/widget-auth-pre-rust` | arixon's pre-rust work. Leave its diff alone. |
| `aomi-bff-unification/` | **git worktree** of `aomi`, Cecilia's branch | `bff-unification` | The portal we actually run lives here. Created via `git worktree add`. |
| `product-mono/` | Rust backend / runtime | `main` (= `origin/main`, the real prod code) | Has 3 **uncommitted local patches** — see §6. |
| `db-master/` | Canonical DB migrations repo | `main` | NOTE: behind product-mono; the current schema is in `product-mono/supabase/migrations` (40 files). |

## 2. The running stack (what "working" looks like)

```
browser ──> portal :3000 (bff-unification)  ──proxy──>  backend :8080 (product-mono main)
                 │  mints EdDSA AccountBearer                  │ verifies bearer, find-only DbUser::get
                 └── resolve-or-create user ──────────────────┴──> Postgres :54322  DB = aomi_local
```

| Service | URL / addr | Provided by |
|---|---|---|
| Backend | http://127.0.0.1:8080 (`/health` → 200) | `product-mono`, `cargo run -p backend` (direct, see §3) |
| Portal | http://127.0.0.1:3000 | `aomi-bff-unification`, `pnpm --filter portal dev` |
| Postgres | `127.0.0.1:54322`, **database `aomi_local`** | local Supabase (OrbStack container `aomi-api-e2e-supabase`) |

Auth uses a **throwaway dev EdDSA keypair** (§5): portal signs the AccountBearer,
backend trusts the public half in its `service.toml`.

**Verified working from terminal:** SIWE + Para login → `/api/account` 200 →
`/api/sessions` (threads) 200 → `/api/state` 200 → **chat reply streams** (via
OpenRouter). See §7 for the exact test.

## 3. How to START / RESTART the backend

The maintained `./scripts/dev.sh` does **not** work well here (it hits GitHub API
rate limits on its plugin preflight, and it ignores `--db local` — see §4). Run
the backend **directly** with this launcher. Save it somewhere (it currently lives
only in a session scratchpad, so recreate it):

`product-mono/run-local-backend.sh`:
```bash
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
set -a
source "$SCRIPT_DIR/.env.dev"
set +a
# .env.dev points OpenRouter at a local proxy (127.0.0.1:18082) that isn't running
# here; use the real OpenRouter endpoint so the streaming chat path works.
export OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
export OPENROUTER_API_BASE=https://openrouter.ai/api/v1
# Force the LOCAL db (the backend otherwise hardcodes a remote pooler — see §4)
export DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/aomi_local
export BACKEND_HOST=127.0.0.1 BACKEND_PORT=8080 RUST_LOG=info BAML_LOG=warn
cd "$SCRIPT_DIR/aomi"
exec cargo run -p backend
```

Start / restart:
```bash
# stop any old one first
pkill -f "target/debug/backend"; lsof -ti tcp:8080 | xargs kill -9 2>/dev/null

# run it (background); first build ~50s, restarts ~20s
nohup bash ../product-mono/run-local-backend.sh > /tmp/aomi-backend.log 2>&1 &

# wait for health
until curl -sf http://127.0.0.1:8080/health >/dev/null; do sleep 2; done; echo OK
```

Confirm it's on the local DB (should be `127.0.0.1:54322`, NOT a remote `18.x`):
```bash
lsof -nP -p "$(lsof -ti tcp:8080 -sTCP:LISTEN)" | grep ESTABLISHED | grep 5432
```
The startup log should show `Selection { rig: Gemini3Flash, baml: Gemini3Flash }`.

## 4. The database (`aomi_local`)

**Why a custom DB:** the backend's pool is **hardcoded** to a remote Supabase
pooler (`AomiDatabase::default()` → `DEFAULT_DATABASE_URL` in
`product-mono/aomi/crates/database/src/lib.rs`). It reads no env var, so
`dev.sh --db local` does NOT move it. The §6 `main.rs` patch makes it honor
`DATABASE_URL`; we point that at a fresh local DB called `aomi_local`.

The running local Supabase (`:54322`) is a **stale e2e snapshot** owned by a
different supabase project and has no migration tracking — it can't be migrated in
place. So we created a clean DB and applied the current migrations:

```bash
ADMIN="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
DBL="postgresql://postgres:postgres@127.0.0.1:54322/aomi_local"
PRODUCT_MONO_ROOT="$(cd ../product-mono && pwd)"

# (re)create the DB
psql "$ADMIN" -c "DROP DATABASE IF EXISTS aomi_local;" -c "CREATE DATABASE aomi_local;"

# apply all 40 product-mono migrations in order (self-contained, pgcrypto-only)
for f in "$PRODUCT_MONO_ROOT"/supabase/migrations/*.sql; do
  psql "$DBL" -v ON_ERROR_STOP=1 -q -f "$f" || { echo "FAILED: $f"; break; }
done
```

Sanity check (all should be present):
```bash
psql "$DBL" -tAc "select to_regclass('public.users'), to_regclass('public.auth_identities'),
  to_regclass('public.sessions'), to_regclass('public.scheduled_intents'),
  exists(select 1 from information_schema.columns where table_name='applications' and column_name='app_source_id');"
```

If the Supabase container itself is stopped, restart OrbStack / the supabase stack
that owns `aomi-api-e2e-supabase`, then re-run the create+migrate block above. The
`aomi_local` data (test users) is disposable; logins recreate it.

## 5. Dev signing keypair (AccountBearer trust)

The portal mints an EdDSA `AccountBearer`; the backend verifies it against a public
key under `kid = aomi-bff-dev-1`. We generated a throwaway dev pair (the real
`aomi-bff-dev-1` private key isn't in the repo). **These are local-dev only.**

- **Backend trust** — `product-mono/aomi/service.toml` (gitignored; copied from
  `aomi/service.dev.toml`, then its `aomi-bff` public_key replaced with the one
  below). Backend reads `service.toml` from its working dir (`product-mono/aomi/`).
- **Portal signer** — `aomi-bff-unification/apps/portal/.env.local` →
  `PORTAL_SERVICE_PRIVATE_KEY`. Store the private half only in local env /
  1Password, never in git.

```
# PUBLIC (goes in product-mono/aomi/service.toml under kid aomi-bff-dev-1, both
# the user and service trusted_issuer entries):
-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEARK6H6nByUxFk68PqBKJocX11IX+9zKFFne0rXKdW94M=
-----END PUBLIC KEY-----
```

Regenerate a matched pair with:
```bash
openssl genpkey -algorithm ed25519 -out dev.key
openssl pkey -in dev.key -pubout
```

Put the public key in `packages/account/src/topology-data.ts` and
`product-mono/aomi/service.toml` / `service.dev.toml`; put the private key in
`apps/portal/.env.local` as `PORTAL_SERVICE_PRIVATE_KEY` and mirror it in
1Password. Restart the backend and portal after any rotation.

## 6. Uncommitted local patches in `product-mono` (don't lose these)

`product-mono` is on `main` with 3 uncommitted edits (see `git -C product-mono diff`):

1. `aomi/bin/backend/src/main.rs` — `AomiDatabase::default()` → honor `DATABASE_URL`
   (so the local DB is used).
2. `aomi/crates/baml/src/model.rs` — `Selection::default()` rig+baml → `Gemini3Flash`
   (OpenRouter), was `Gemini3Flash`/`Gpt5Nano`.
3. `aomi/bin/backend/src/endpoint/session/model.rs` — the UI model-switch forced
   `baml = Gpt5Nano`; changed to `Gemini3Flash`.

Plus the gitignored `product-mono/aomi/service.toml` + `product-mono/service.toml`
(dev trust config, §5). Revert the code with `git -C product-mono checkout -- <file>`.

## 7. LLM / model config (why chat was failing)

`.env.dev` LLM keys are mostly **dead**: `OPENAI`, `ANTHROPIC` return 401,
`GOOGLE` is empty. **Only `OPENROUTER_API_KEY` is live.** So:

- Use **OpenRouter-backed models only**: `Gemini3Flash`, `Kimi K2.6`, `DeepSeek*`.
  Avoid direct OpenAI/Claude/Gemini options in the model picker.
- `.env.dev` values are **single-quoted**; load with `set -a; source .env.dev; set +a`
  (a naive quote-strip leaves `'sk-...'` and every call 401s).
- `.env.dev` sets `OPENROUTER_BASE_URL` to a local proxy `127.0.0.1:18082` that
  isn't running — override to `https://openrouter.ai/api/v1` (the launcher does).
- On-chain tools are flaky: the `ALCHEMY_API_KEY` lacks OP/ARB/Polygon mainnet and
  Infura 429s. Plain chat works; deep blockchain tool calls may error. Unrelated.

Terminal chat smoke test (uses an existing session cookie jar — do a SIWE login
first, see the SIWE flow in `aomi-bff-unification/packages/account/src/siwe.ts`):
```bash
# POST a message (note: POST, query-string args, x-session-id header)
curl -s -X POST -b /tmp/jar -H "Host: 127.0.0.1:3000" -H "x-session-id: $(uuidgen)" \
  "http://127.0.0.1:3000/api/chat?app=default&message=hi&client_id=$(uuidgen)"
# then poll http://127.0.0.1:3000/api/state?client_id=... for the agent message
```

## 8. How to START the portal (bff-unification)

```bash
cd ../aomi-bff-unification
# first time only:
pnpm install
# run (background):
nohup pnpm --filter portal dev > /tmp/aomi-portal.log 2>&1 &
until curl -sf http://127.0.0.1:3000 >/dev/null; do sleep 2; done; echo OK
```

Its env is `apps/portal/.env.local` (already configured). Key vars:
`PORTAL_SERVICE_PRIVATE_KEY` (§5), `AOMI_SESSION_SECRET`,
`AOMI_PROXY_BACKEND_URL=http://127.0.0.1:8080`, `NEXT_PUBLIC_BACKEND_URL=/`,
`DATABASE_URL=...:54322/aomi_local`, plus the Privy/Para/WalletConnect public ids.

If a model switch or chat hangs, the portal dev server sometimes dies — just
restart it with the block above (env changes also need a restart).

## 9. Auth flow (one paragraph)

`bff-unification` ships `@aomi-labs/account` (server-only): SIWE/Para login →
`resolveOrCreateByWallet`/`resolveOrCreateCanonicalUser` writes the canonical user
into the **same DB the backend reads** (`aomi_local`) → sets an HS256 `aomi_session`
cookie → the `[...slug]` proxy reads that cookie and **mints an EdDSA AccountBearer
server-side** (`sub` = canonical UUID, `iss` aomi-bff, `kid` aomi-bff-dev-1, `aud`
aomi-backend) and injects it on calls to the backend → backend verifies it
(`aomi-service`, trust from `service.toml`) and looks the user up **find-only**.
The browser never holds the bearer. Full contract:
`product-mono/docs/topics/account-authentication/facts/service-identity.md`.

## 10. Quick reference

```bash
# health
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8080/health   # backend
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/          # portal

# restart backend / portal: see §3 / §8
# recreate DB: see §4
# product-mono local patches: git -C ../product-mono diff
# tear down: pkill -f target/debug/backend ; lsof -ti tcp:3000 | xargs kill ; (optionally) DROP DATABASE aomi_local
```

## 11. Gotchas checklist (the things that cost time)

- [ ] Backend hardcodes a remote DB — needs the `main.rs` patch + `DATABASE_URL`.
- [ ] `dev.sh` plugin preflight 403s on GitHub rate limits — run the backend directly.
- [ ] Local `:54322` is a stale snapshot with no migration tracking — use a fresh
      `aomi_local` DB built from `product-mono/supabase/migrations` (NOT db-master).
- [ ] `.env.dev` values are single-quoted — `source` them, don't hand-parse.
- [ ] Only `OPENROUTER_API_KEY` works; `OPENROUTER_BASE_URL` points at a dead local
      proxy — override to `openrouter.ai`. Use OpenRouter models only.
- [ ] The dev signing key is throwaway and lives in two files that must agree (§5).
