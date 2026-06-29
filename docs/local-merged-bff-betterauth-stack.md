# Local Merged BFF/BetterAuth Stack

This is the quick path for testing the merged `codex/merge-bff-betterauth`
portal in this repo, not the older sibling `aomi-bff-unification` worktree.

## Start

```bash
pnpm run dev:auth-stack
```

Open:

- Portal: http://localhost:3000
- Backend health: http://127.0.0.1:8080/health

The script starts two tmux sessions:

```bash
tmux attach -t aomi-portal
tmux attach -t aomi-backend
```

Logs:

```bash
tail -f /tmp/aomi-portal.log
tail -f /tmp/aomi-backend.log
```

## What The Script Does

`scripts/dev-auth-stack.sh` owns this local dev stack:

- Uses sibling `../product-mono/run-local-backend.sh` for the Rust backend on
  `127.0.0.1:8080`.
- Runs this repo's `apps/portal` on `127.0.0.1:3000` using
  `apps/portal/node_modules/.bin/next`, which is the portal's Next 16 install.
- Uses the local Supabase Postgres exposed on `127.0.0.1:54322`.
- Ensures `aomi_local` exists.
- Applies product-mono migrations only if the backend `users` table is missing.
- Applies `packages/auth/src/db/schema.sql` for `aomi_users`,
  `aomi_auth_identities`, `aomi_wallets`, and `jwks`.
- Runs Better Auth's migration helper so `"user"`, `"session"`, `"account"`,
  `"verification"`, and `"walletAddress"` exist.
- Overrides the portal runtime `DATABASE_URL` to
  `postgresql://postgres:postgres@127.0.0.1:54322/aomi_local`.

That last point matters: `apps/portal/.env.local` still has a stale
`DATABASE_URL` for `localhost:55432/aomi_auth`. If you run the portal directly,
Better Auth session reads fail with `ECONNREFUSED`. The script leaves the file
alone and only overrides the env inside the tmux process.

## Commands

```bash
pnpm run dev:auth-stack          # restart backend + portal
pnpm run dev:auth-stack:status   # show health, listeners, tmux sessions
pnpm run dev:auth-stack:stop     # stop the tmux sessions and free ports
./scripts/dev-auth-stack.sh db   # only prepare the local DB/schema
```

## Expected Local Pieces

- OrbStack/Supabase is running and exposes `supabase_db_aomi-api-e2e-supabase`
  on `127.0.0.1:54322`.
- `../product-mono/run-local-backend.sh` exists and points the backend at
  `aomi_local`.
- `../product-mono` keeps the local backend patches described in
  `HANDOFF-LOCAL-BACKEND.md`, especially the patch that makes the backend honor
  `DATABASE_URL`.
- `apps/portal/.env.local` has the local backend and auth values, including
  `AOMI_PROXY_BACKEND_URL=http://127.0.0.1:8080` and
  `PORTAL_SERVICE_PRIVATE_KEY`.

## Sanity Checks

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8080/health
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/
curl -s http://localhost:3000/api/aomi/account
```

Unauthenticated `/api/aomi/account` should return a null account payload, not a
Better Auth `Failed to get session` error. Some proxied backend routes may return
`401` before login; that is expected.
