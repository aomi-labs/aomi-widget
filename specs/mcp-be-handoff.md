# BE handoff — MCP v1 prototype

> **Status (2026-05-31): DELIVERED on the BE.** Everything in this handoff
> is implemented in `product-mono`: `POST /api/_internal/secrets` and the
> `X-Aomi-Auth` guard (`bin/backend/src/endpoint/admin_scope/internal_secrets.rs`,
> `bin/backend/src/auth/verify_headers.rs`). The atomic approvals path that
> superseded the two-step flow is in `internal_approvals.rs`. This doc is
> retained as the original design handoff — read it for intent, not status.

What the Rust BE needs to add so the TypeScript MCP / `@aomi-labs/auth`
prototype in `apps/portal` works end-to-end. v1 only. Postgres, KMS, mTLS,
and the credential proxy are not in scope here.

Spec context: `specs/mcp-design.md` §4 (v1 prototype scope) and §8.1
(commitments).

---

## 1. New endpoint — auth-trusted secret ingest

### `POST /api/_internal/secrets`

The portal's `auth` module calls this after an OAuth callback to stash the
issued credential into the BE's existing `SecretVault`. The portal owns the
OAuth dance; BE owns the in-memory secret store and the tool runtime that
reads from it (same as today's `POST /api/secrets`).

**Auth.** Validate `X-Aomi-Auth: <token>` against a static env var:

```rust
let expected = std::env::var("AOMI_AUTH_TOKEN")
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
let supplied = headers
    .get("x-aomi-auth")
    .and_then(|v| v.to_str().ok())
    .ok_or(StatusCode::UNAUTHORIZED)?;
if !constant_time_eq(supplied.as_bytes(), expected.as_bytes()) {
    return Err(StatusCode::UNAUTHORIZED);
}
```

Constant-time compare matters; ordinary `==` leaks the token byte by byte.

**Request body.**

```json
{
  "user_id": "00000000-0000-0000-0000-000000000001",
  "app": "dummy",
  "secrets": {
    "DUMMY_TOKEN": "dummy_token_alice_1779442995545"
  }
}
```

- `user_id` — opaque Aomi user id. Treat as a string; **do not** derive it
  from any session header. The portal vouches for it via `X-Aomi-Auth`.
- `app` — required. Per-app scope (`SecretVault::ingest_app`). v1 never
  needs the flat-store path here.
- `secrets` — map of name → value. May be empty (no-op, return `{}`).

**Response.**

```json
{ "handles": { "DUMMY_TOKEN": "<opaque-handle-from-SecretVault>" } }
```

Whatever string `SecretVault::ingest_app` returns is fine — the portal
treats it as an opaque pointer and stashes it in `access_approval.secret_handle`.

**Behavior.**

```rust
// Use user_id as the SecretVault client_id. SecretVault is in-process and
// keyed on a string; that's sufficient. There's no per-user session to
// reuse here — auth's request stands alone.
let client_id = body.user_id.clone();
let vault = SecretVault::get_or_init().await;
let handles = vault.ingest_app(&client_id, &body.app, body.secrets);
Ok(Json(json!({ "handles": handles })))
```

**Do not.**

- Do not require a `SessionId` extension on this route. The existing
  `/api/secrets` endpoints stay as-is for FE/CLI; this is a separate
  surface with a different auth model.
- Do not call `auth_current`. The `X-Aomi-Auth` token is the only check.
- Do not log secret values or `secrets` map contents. `tracing` field
  `count = body.secrets.len()` is fine; `secrets = ?body.secrets` is not.
- Do not read or return the stored values. Only handles ever leave the
  endpoint.

**Mount.** Probably alongside the existing secrets endpoints in
`bin/backend/src/endpoint/`, e.g. `internal_secrets.rs`. Wire into the
router under `/api/_internal/secrets`. Make sure any auth middleware
that normally injects `SessionId` does **not** run on this route.

---

## 2. Env vars

Add to BE config (and document in the deploy story alongside the existing
ones):

| Var               | Purpose                                                      |
| ----------------- | ------------------------------------------------------------ |
| `AOMI_AUTH_TOKEN` | Static shared secret between BE and portal. Must match the same env on the portal. Used today for `X-Aomi-Auth` on `/api/_internal/secrets`; will also gate `/api/auth/proxy/*` and Path 2 outbound calls later. |

For local dev: `export AOMI_AUTH_TOKEN=dev-aomi-auth-token` on both sides.
Production: rotate via the usual secret pipeline. mTLS replaces this in
post-v1.

---

## 3. Verification

Once the endpoint is up:

```bash
# In one shell — BE running on :8080 with AOMI_AUTH_TOKEN exported.
# In another — bring up the portal pointed at it.
export AOMI_BE_URL=http://localhost:8080
export AOMI_AUTH_TOKEN=dev-aomi-auth-token
pnpm --filter portal dev   # or pnpm --filter portal dev:ngrok

# Step 1 — portal triggers a real be-vault ingest via the dummy provider:
BEGIN=$(curl -s -X POST http://localhost:3000/api/auth/begin \
  -H 'Content-Type: application/json' \
  -H "X-Aomi-Auth: $AOMI_AUTH_TOKEN" \
  -d '{"user_id":"alice","provider":"dummy"}')
STATE=$(echo "$BEGIN" | sed 's/.*"state_token":"\([^"]*\)".*/\1/')

# Step 2 — simulate the user approving:
curl -s -X POST "http://localhost:3000/api/auth/dummy/callback" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d "state=$STATE"

# Step 3 — verify the BE got the secret stored under user_id=alice, app=dummy:
curl -s -H 'session: alice' http://localhost:8080/api/secrets
# Expect a non-empty `by_app.dummy` slot containing DUMMY_TOKEN.
```

(Step 3 reuses the existing `GET /api/secrets` listing endpoint. If the
session-id-derived listing makes that awkward — `GET /api/secrets` returns
per-`session_id` views — feel free to add a small internal listing
sibling, or just check via tool-runtime logs that `SecretVault` resolved
the slot.)

---

## 4. Path 2 stub (BE-initiated auth) — optional in v1

The BE-initiated auth flow (§5.3 in the design doc) is "out of scope" for
v1 in the sense that it doesn't need a real messaging channel to surface
the URL. But the HTTP client side is small and worth scaffolding so PR #2
on the TS side can integration-test against it.

### What to add

A small Rust HTTP client module the agent loop / cron can call:

```rust
pub struct AuthClient {
    portal_url: String,        // e.g. https://portal.aomi.dev
    auth_token: String,        // AOMI_AUTH_TOKEN
    http: reqwest::Client,
}

pub struct BeginResult {
    pub state_token: String,
    pub auth_url: String,
    pub expires_at: i64,
}

pub enum AwaitResult {
    Pending,
    Completed { approval_id: String },
    Failed { error: String },
}

impl AuthClient {
    pub async fn begin(&self, user_id: &str, provider: &str)
        -> anyhow::Result<BeginResult>;
    pub async fn await_(&self, state_token: &str, timeout_ms: u64)
        -> anyhow::Result<AwaitResult>;
}
```

Wire targets:

- `POST {portal_url}/api/auth/begin` with `X-Aomi-Auth` header and JSON
  body `{ user_id, provider }`. Reply: `{ state_token, auth_url, expires_at }`.
- `GET {portal_url}/api/auth/await/{state}?timeout_ms=...`. Reply matches
  `AwaitResult` shape: `{"status":"pending"|"completed"|"failed", ...}`.

### What to NOT add yet

- No messaging channel to push the URL to the user. The agent that calls
  `begin()` is responsible for surfacing the URL however it currently
  surfaces async output to the user (TBD; out of `auth`'s scope).
- No proxy yet. After `await_` returns `Completed`, the BE can call any
  third-party API directly using whatever it already does today
  (`SecretVault` lookup → upstream call). The dedicated `/api/auth/proxy/*`
  arrives when we move tokens out of `SecretVault`.

---

## 5. Acceptance checklist

- [ ] `POST /api/_internal/secrets` exists, guarded by `X-Aomi-Auth`,
      reads `AOMI_AUTH_TOKEN` from env.
- [ ] `401` on missing or wrong header (use constant-time compare).
- [ ] `400` on missing `user_id` or `app`.
- [ ] Empty `secrets` returns `{ "handles": {} }`, no error.
- [ ] Calls `SecretVault::ingest_app(&user_id, &app, secrets)` and
      returns its handles verbatim.
- [ ] Does not require / read a session id.
- [ ] Does not log secret values.
- [ ] Verification flow in §3 passes against `pnpm --filter portal dev`.
- [ ] (Optional) `AuthClient` HTTP module compiles and round-trips against
      the portal's `/api/auth/begin` + `/api/auth/await/{state}`.

That's everything blocking the TS side. Ping when `AOMI_AUTH_TOKEN` is
deployable and the endpoint is up — the portal can be flipped off
`AOMI_SECRET_STORE=memory` and the dummy provider exercises the whole
chain through real `SecretVault` storage.
