# Widget User Auth — Implementation Plan

> Status: build-ready spec. Rewritten 2026-06-17 against this repo on branch
> `polish-multi-wallet`. Supersedes the prior draft. Every decision here was
> locked in a review session; the **Decisions log** (§20) lists them verbatim.
>
> **One-line goal:** give every widget user a stable `aomi_users.id`, link their
> verified wallets and provider logins to it, and stop treating a transient
> browser wallet connection as the durable owner of threads or account data.

---

## Table of contents

1. The one idea
2. Product invariants
3. Two systems — do not conflate them
4. Architecture & the v1 seam
5. The token model
6. Identity resolution — the signal ladder
7. How threads ride along (merge data transfer)
8. External auth sources (BetterAuth SIWE, Privy, Para, Solana)
9. Database
10. TypeScript structs
11. Environment
12. BetterAuth setup
13. Server API contracts
14. Account service algorithms
15. Auth flows (step by step)
16. Server-side verification details
17. Frontend integration
18. Security rules
19. Phases — agent-followable checklists
20. Build-without-the-Rust-team boundary + handoff
21. Testing plan
22. Open items
23. Decisions log
24. Implementation notes by file

---

## 1. The one idea

Today a user effectively _is_ their wallet address. That is wrong: a wallet only
**proves control right now**. People rotate wallets, use embedded Privy/Para
wallets, disconnect, reconnect, and sign from multiple devices. If threads,
billing, and settings are keyed to an address, all of that breaks.

So we separate three things that are normally jammed together:

```mermaid
flowchart LR
  A["Auth proof<br/>SIWE / Privy / Para<br/>(transient)"]
  I["Product identity<br/>aomi_users.id<br/>(durable)"]
  S["Signing power<br/>live wallet connection<br/>(transient)"]
  A -->|resolves to| I
  S -.->|independent of| I
```

- **Auth proof** is re-established each login and is throwaway.
- **Product identity** (`aomi_users.id`) is stable forever and owns all data.
- **Signing power** is whatever the browser can sign with _this moment_, and has
  nothing to do with who the user is.

Build these as separate layers and the widget supports wallet-only users,
Privy/Para users, multiple linked wallets, account management, merges, and stable
thread ownership — without painting the backend into a wallet-address corner.

The stable model end to end:

```text
BetterAuth session  ->  BetterAuth user id  ->  aomi_users.id (canonical)
  ->  linked identities + linked wallets  ->  AccountRuntime payload
  ->  (Phase F) product-mono sessions.user_id (already account-owned)
```

---

## 2. Product invariants

These hold for the whole system. Violating one is a bug, not a tradeoff.

1. A browser wallet connection is **temporary**.
2. A wallet link is durable only after **server-side verification**.
3. A user is **canonical and stable** across sessions and devices.
4. Threads, runs, preferences, billing, and settings are keyed by
   `aomi_users.id`, **never** by wallet address.
5. The active wallet address is **transaction context**, not the owner id.
6. A wallet or provider subject belongs to **only one active** Aomi user (enforced
   by a partial unique index).
7. Provider _display_ fields are not proof. Trust only server-verified SIWE
   messages, verified Privy tokens, verified Para JWTs, and BetterAuth sessions.
8. **Never store raw provider tokens** in Aomi tables. Verify, extract what you
   need, discard the token.
9. **Wallet disconnect is not Aomi sign-out.** Disconnecting MetaMask/Privy/Para
   only changes live signing capability. (Our sign-out, when the user explicitly
   invokes it, _is_ a full logout — see §15.6.)
10. Linking a new wallet requires the **new** wallet's fresh signature. The
    already-linked wallets never re-sign; the existing identity rides the session.

---

## 3. Two systems — do not conflate them

`packages/auth` already exists and means something else. There are **two distinct
auth jobs** in this repo:

|                     | System A — account (this plan)                       | System B — MCP approvals (exists)                                       |
| ------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------- |
| Question it answers | "Who is this user?"                                  | "May app X use provider Y?"                                             |
| Pieces              | BetterAuth session, `aomi_*` graph, `AccountRuntime` | `packages/auth` begin/await/callback, `access_approvals`, `SecretVault` |
| Storage             | Fresh Supabase (BetterAuth + `aomi_*`)               | Portal in-memory + BE `/api/_internal/approvals`                        |
| Status              | We build it                                          | Already shipped; we only **relocate** it                                |

**System B today** (`packages/auth/src/`): `api/{begin,await,lookup,revoke}.ts`,
`providers/{privy,dummy,registry}.ts` (incl. `makePrivyJwtVerifier`, ES256),
`routes/{begin,start,callback,await}.ts`, `secret-store/be-approvals.ts`
(`BeApprovalsStore`), `store/{memory}.ts` (`MemoryStore`). Portal mounts it at
`/api/auth/begin`, `/api/auth/{privy,dummy}/{start,callback}`, and
`/api/auth/await/[state]`. It is an OAuth credential authority for MCP
`connect_provider` / `connect_app`; the BE's `/api/_internal/approvals` endpoint
(not `packages/auth` directly) persists the `DbAuthIdentity` row + secrets into the
BE `SecretVault`.

**Plan:** relocate System B into `packages/auth/src/mcp-approvals/` **first**
(Phase A), and **move its portal routes off `/api/auth/*` to `/api/mcp-auth/*`** so
BetterAuth can own the idiomatic `/api/auth/[...all]` mount. (This renames shipped
routes that mcp-core and the BE call — coordinate those callers as part of Phase A.)
Relocating also keeps the new account code from accidentally coupling MCP approval
grants to a widget user's web session. Reuse `makePrivyJwtVerifier` instead of
reimplementing Privy verification. The two systems' identity tables
(`DbAuthIdentity` vs `aomi_auth_identities`) may converge only when the unified DB
lands — explicitly **not** in this milestone.

Target package layout:

```text
packages/auth/src/
  mcp-approvals/            # relocated System B (api, routes, providers, secret-store, store)
  better-auth/
    auth.ts                 # betterAuth(...) with SIWE + bearer plugins
    auth-client.ts          # createAuthClient(...) with siweClient
    env.ts                  # readAccountAuthEnv()
    siwe.ts                 # verifyMessage + nonce helpers
  db/
    pool.ts                 # pg.Pool
    schema.sql              # aomi_* migration
    queries.ts              # typed query helpers
    migrations/
  service/
    account-service.ts      # ensure user, resolveSignal (link/noop/conflict)
    wallet-normalization.ts # normalizeWalletAddress, walletKey, caip10
    provider-exchange.ts    # verify + link entrypoint
    siwe-mirror.ts          # mirror BetterAuth walletAddress -> aomi_wallets
  providers/
    privy.ts                # verifyPrivyToken (reuses makePrivyJwtVerifier)
    para.ts                 # verifyParaJwt (JWKS)
  types.ts                  # shared account types
```

`apps/portal` imports from `@aomi-labs/auth` and mounts the route handlers.

---

## 4. Architecture & the v1 seam

BetterAuth is **server code** living in the portal — it is the auth backend, not a
frontend helper. The account layer is **additive**: it sits in front of the Rust
backend, which stays unchanged in v1.

```mermaid
flowchart TD
  FE["Widget frontend<br/>wallet-kit · SIWE client · getCredential"]
  P["Portal — Next.js (your backend)<br/>BetterAuth core · /api/aomi/* · BFF proxy"]
  DB["Supabase Postgres (fresh project)<br/>BetterAuth tables + aomi_* graph"]
  R["Rust backend — UNCHANGED in v1<br/>sessions already account-owned (sessions.user_id)"]
  FE -->|cookie same-origin · bearer cross-site| P
  P -->|SQL| DB
  FE -->|existing provider-token exchange| P
  P -->|proxy, forwards credential (bearer = Phase F)| R
```

**The v1 seam (why we are not blocked on the Rust team):** two auth paths coexist.

- Identity & account management run entirely on **BetterAuth + your Supabase**.
- Authenticated calls to Rust keep using the **existing provider-token exchange,
  exactly as today.** product-mono already has account-owned sessions
  (`sessions.user_id`), so Privy/Para users get a real Rust account session today.
- **SIWE / wallet-only users are Rust-anonymous in v1** — no provider token to
  exchange, so `sessions.user_id = null` and history is ephemeral, exactly like
  today's non-provider users. They are still fully identified at the _portal_ (their
  Aomi account). Everyone gets a portal-minted bearer at Phase F (§7 + Phase F).

What each side owns:

- **BetterAuth owns:** the HTTP-only browser session cookie (and bearer for
  cross-site), SIWE nonce/verify endpoints, and the BetterAuth
  user/session/account/walletAddress tables.
- **Aomi account service owns:** the canonical `aomi_users.id`, linked provider
  subjects, linked wallets, account settings, wallet labels, the conflict policy,
  and the future id mapping Rust will trust.
- **Rust backend** is a dashed/future box for this milestone. Do not route
  portal-only BetterAuth sessions through product-mono account routes until Phase F
  has solved id sync or DB unification.

`apps/portal/src/app/api/[...slug]/route.ts` is already the BFF proxy: it forwards
one flat header allowlist (`authorization`, `x-session-id`, `aomi-app-key`,
`content-type`, `accept`) and allowlists `/api/account/sessions/exchange`. That
proxy is the eventual injection point for a portal-minted Rust bearer (Phase F) —
**not** a parallel `/api/aomi/*` island.

---

## 5. The token model

There are **three different credentials**. People conflate them constantly.

| Credential                                           | Made by                       | Proves                                    | Lives                                                 | Stored?                            |
| ---------------------------------------------------- | ----------------------------- | ----------------------------------------- | ----------------------------------------------------- | ---------------------------------- |
| **Provider token** (Privy identity token / Para JWT) | Privy / Para                  | "Logged into Privy/Para"                  | Sent once to portal, verified, discarded              | Never raw — verified, then dropped |
| **BetterAuth session**                               | BetterAuth (portal)           | "This browser is `aomi_users.X`"          | HTTP-only cookie (same-origin) or bearer (cross-site) | In BetterAuth's `session` table    |
| **Account bearer** (`account_session`)               | Rust today; portal at Phase F | "Backend, trust the caller is `users.id`" | `Authorization: Bearer` to Rust                       | Not stored — short-lived           |

The BetterAuth session is **not a JWT** by default (DB session row + signed
cookie). Only the provider tokens and the Rust account bearer are JWTs.

**Who actually holds an account bearer in v1:** only Privy/Para users, via the
existing provider-token exchange (Rust mints it as today). A SIWE/wallet-only user
has no provider token, so in v1 they make Rust calls as an anonymous session with no
server-persisted history; they become first-class to Rust at Phase F, when the
portal mints + injects the bearer for everyone (§7).

### 5.1 Account bearer anatomy (already shipped in product-mono)

```json
{
  "sub": "<product-mono users.id>",
  "iss": "aomi-backend",
  "aud": "aomi-api",
  "iat": 1781540000,
  "exp": 1781540900,
  "kind": "account_session"
}
```

Token rules (do not change without a coordinated backend change):

- Header algorithm is **HS256**; secret is `AOMI_ACCOUNT_TOKEN_SECRET` (≥32 bytes).
- `exp − iat = 900` seconds (15 min).
- Rust validates issuer (`aomi-backend`), audience (`aomi-api`), expiry, signature,
  and `kind = "account_session"`.
- `sub` must be a product-mono `users.id` for `CanonicalUser` routes, because
  `authenticate_canonical_user` calls `DbUser::get(sub)`.
- Claims `sid`, `auth_time`, `wallets_version` are **not read today**. Adding them
  is harmless only if the Rust struct accepts them; they do nothing without a
  backend change. Changing `iss`/`aud`/`kind`, omitting `kind`, or switching to
  asymmetric signing **401s today**.

The shipped Rust pieces (paths under `product-mono/aomi/`):
`bin/backend/src/auth/canonical_user.rs`,
`auth/request/{router,authenticator,credentials}.rs`,
`handler/account/session_exchange.rs`. `RouteAuthClass::CanonicalUser` serializes
in OpenAPI as `account_token`. The current exchange route is
`POST /api/account/exchange`, but the TS client/proxy still call
`/api/account/sessions/exchange` — a real mismatch (alias it; §19 Phase F).

### 5.2 Sign-in flow and where tokens come from

```mermaid
sequenceDiagram
  participant W as Wallet
  participant FE as Widget
  participant P as Portal (BetterAuth)
  participant DB as Supabase
  participant R as Rust
  FE->>P: siwe.nonce(address, chainId)
  P-->>FE: nonce
  W->>FE: sign ERC-4361 message
  FE->>P: siwe.verify(message, signature)
  P->>DB: resolve-or-create user, write session
  P-->>FE: session cookie / bearer
  FE->>P: GET /api/aomi/account
  P-->>FE: AccountRuntime payload
  Note over P,R: v1 — Privy/Para via existing exchange; SIWE users anonymous
  FE->>P: backend call
  P->>R: proxy (forwards credential; portal-minted bearer = Phase F)
  R-->>FE: data
```

### 5.3 Expiry — the user almost never re-signs

A wallet signature happens once, at sign-in. After that:

| Thing                 | Lifetime                                | Refreshed by                              |
| --------------------- | --------------------------------------- | ----------------------------------------- |
| Wallet SIWE signature | one-time, at login                      | the user (rare)                           |
| BetterAuth session    | 7 days, **rolling daily** (`updateAge`) | automatic on activity                     |
| Account bearer        | 15 min                                  | portal re-mints silently from the session |

The bearer expiring every 15 minutes is **invisible** — the portal re-mints from
the still-valid session. A wallet re-signature is only needed when (a) the session
fully expires after long inactivity, (b) the user explicitly signs out, or
(c) they **link a new wallet** — and there the _new_ wallet signs to prove control;
the existing identity rides the session and the last wallet never re-signs.

---

## 6. Identity resolution — the signal ladder

This is the heart of linking, merging, and recovery. It reduces to **one question
asked of every incoming signal** — _who already owns this signal?_

**Vocabulary (precise — the algorithm uses these exactly):**

- **Signal** — a thing that identifies a user: a wallet address, a provider subject
  (`did:privy:…`, Para user id, BetterAuth user id), or a verified email.
- **Claim** — a signal is _claimed_ if an active (non-revoked) row binds it to a
  user. Enforced by partial unique indexes (`(provider, subject)` and
  `(family, normalized_address, chain_scope)`).
- **Login-capable factor** — a signal that can independently start a session: an
  active wallet (SIWE) or an active provider identity (Privy/Para/better_auth).
  **Email is not** a login-capable factor in v1 (no email login), so it never
  counts toward the factor total — it only follows the move ladder as a signal.
- **Link** — attach an _unclaimed_ signal to a user. Automatic, no prompt.
- **Move** — relocate a _claimed_ signal from another account to yours. Always
  gated behind a warning.
- **Merge** — the special case of a move where the other account loses its _last_
  login-capable factor: absorb its data into yours and permanently close it.

```mermaid
flowchart TD
  S["Identity signal arrives<br/>wallet · provider · verified email"]
  Q{"Who owns this signal?"}
  U["Unclaimed → auto-link<br/>no prompt (green)"]
  M["Already yours → no-op / refresh"]
  C["Owned by another active account<br/>409 conflict"]
  S --> Q
  Q -->|nobody| U
  Q -->|you| M
  Q -->|another user| C
```

Rules that fall out of this:

1. **Auto-link only ever touches unclaimed signals** (the green branch). A signal
   owned by another account never moves silently.
2. **Signals owned by another active account are forbidden, not moved.** The user
   must sign into the owning account and unlink the wallet/provider there, or close
   that account through account-management tooling.
3. **There is no merge engine.** We do not choose a survivor, absorb data, or
   deactivate another account as part of link/sign-in.
4. **Safe by construction:** proving control of a wallet/provider is enough to
   create or refresh the owning account, but not enough to transfer it away from
   another active account.
5. **Reactive only.** No background/proactive clustering of accounts. We act on a
   collision at sign-in/link time, never by sweeping the graph.
6. **Email follows the same rule** — unclaimed email auto-links; a claimed email
   conflicts.
7. There is **no separate merge or recovery flow** in account linking.

Edge cases:

- **Concurrency:** uniqueness is guarded by partial unique indexes, and upserts only
  refresh rows owned by the same user. A racing cross-account link returns a
  conflict.
- **Provider-attested wallets** (Privy/Para embedded wallets we did not SIWE-sign)
  are recorded as identities in v1, not imported as wallet rows — so they enter the
  ladder as `provider` signals, not `wallet` signals (§14.3/§14.4).

---

## 7. How threads ride along

**Reality check (verified against product-mono):** chat history is _already
account-owned_ — `sessions` has a `user_id` column and product-mono explicitly
treats the wallet as context, not identity (`active_identity_id` /
`active_identity_wallet_id`; see `crates/database/src/entities/session.rs`). There
is **no `threads` table** and **no `threads.owner_user_id`**. So the durable model
the backend needs already exists; the only missing piece is making the portal's
`aomi_users.id` _be_ the `users.id` that `sessions.user_id` references (the Phase F
id unification).

So the rule is **history follows the account, not the wallet.** Since signals do
not move across active accounts, there is no thread/data transfer during wallet or
provider linking.

**Two regimes — be honest about which is which:**

- **v1 (ids not yet unified):** Privy/Para users already get account-owned sessions
  (`sessions.user_id`) via the existing exchange, so they get a unified per-account
  history today. SIWE/wallet-only users are Rust-anonymous (`sessions.user_id =
null`), so their history is ephemeral until Phase F.
- **Phase F (ids unified):** once `aomi_users.id == users.id`, every signed-in user
  (including SIWE-only) maps to a real `sessions.user_id`. Linking still does not
  move signals or re-key history between active accounts.

---

## 8. External auth sources

### 8.1 BetterAuth SIWE (EVM)

Use BetterAuth's SIWE plugin for EVM wallet authentication. Relevant facts:

- The Next.js route mounts at `/api/auth/[...all]` via `toNextJsHandler(auth)`.
- Server-side calls use `auth.api`, including `auth.api.getSession({ headers })`.
- PostgreSQL is supported through `pg.Pool`.
- The SIWE plugin adds both a server and a client plugin, supports custom nonce
  generation and a custom `verifyMessage`, and validates **nonce, domain, address,
  chain id, and message time bounds** before creating a session.
- It adds its own `walletAddress` table with `userId`, `address`, `chainId`,
  `isPrimary`, `createdAt`. We **mirror** that into `aomi_wallets` (§14.2) so there
  is one wallet graph that also holds provider/SVM wallets BetterAuth can't model.
- `anonymous: true` allows wallet-only users with no email.

Docs: <https://better-auth.com/docs/plugins/siwe>,
<https://www.better-auth.com/docs/integrations/next>,
<https://better-auth.com/docs/adapters/postgresql>,
<https://better-auth.com/docs/concepts/api>,
<https://www.better-auth.com/docs/concepts/users-accounts>,
<https://better-auth.com/docs/concepts/plugins>.

### 8.2 Privy

Use Privy tokens only after server verification. Today `PrivyPluginProvider`
exposes `getCredential()` returning `{ provider: "privy", providerToken: token }`
from `privy.getAccessToken()` — an **access token**.

Two tokens, two jobs (this is a real gap to close, not a rename):

- **Access token** — proves the Privy login. The existing `makePrivyJwtVerifier`
  (`packages/auth/src/providers/privy.ts`) verifies exactly this: ES256,
  `iss = "privy.io"`, `aud = appId`, **requires `sub` + `sid`**, and returns only
  `{ userId, sessionId, expiration }`. **It carries no email or linked accounts.**
  Reuse it only for the auth-proof path.
- **Identity token** — carries email + linked accounts, which feed email auto-link
  and the ladder. This needs **two new pieces**: (1) the widget's `getCredential`
  must also fetch the identity token (`getIdentityToken()` / `user.idToken`), not
  only `getAccessToken()`; and (2) a **new identity-token verifier** (no required
  `sid`; extracts `email` + `linked_accounts`), keyed by
  `PRIVY_IDENTITY_JWT_VERIFICATION_KEY`. Do not assume `makePrivyJwtVerifier`
  handles it.

Use the Privy DID (`sub`, `did:privy:…`) as the stable provider subject from either
token.

Docs: <https://docs.privy.io/authentication/user-authentication/access-tokens>,
<https://docs.privy.io/authentication/user-authentication/tokens>,
<https://docs.privy.io/user-management/users/identity-tokens>.

### 8.3 Para

Use Para JWTs only after server verification. `ParaPluginProvider` already exposes
`getCredential()` from `issueJwt()`.

Verification plan:

- Verify the JWT signature through **Para JWKS** (`PARA_JWKS_URL`); validate `kid`,
  `aud` (the configured Para API key/app id), and `exp`.
- Use the Para user id as the stable provider subject.
- Provider-attested `wallets` / `connectedWallets` are **identity only in v1** (not
  imported as wallet rows).
- **Compatibility warning:** product-mono's current exchange does _not_ verify Para
  via JWKS. It calls `PARA_VERIFY_URL` with `PARA_API_SECRET_KEY` and derives the
  subject as `<auth_type.lowercased()>:<identifier.lowercased()>` — **both** halves
  are lowercased — because that response has no stable Para user id. The new portal
  path uses the JWT/JWKS subject; **Phase F**
  must deliberately reconcile or migrate Rust to the same subject.

Docs: <https://docs.getpara.com/v2/react/guides/sessions-jwt>.

### 8.4 Solana (future)

Solana auth is intentionally future work — do not block EVM SIWE on it. The data
model must be SVM-safe now:

- Preserve SVM address case exactly (base58 is case-sensitive).
- Store `family = 'svm'`.
- Reserve `linked_via = 'siws'` / `proof method = 'siws'` for a future Solana
  challenge.
- Do not assume BetterAuth SIWE covers SVM (it is EVM-only).

A connected SVM wallet may be shown **read-only** in the UI before SVM auth exists.

---

## 9. Database

Fresh Supabase Postgres project, server-only connection. Four Aomi-owned tables
plus BetterAuth's generated tables. (`aomi_wallet_proofs` and
`aomi_wallet_challenges` are intentionally **out** of v1 — proof-of-verification is
what BetterAuth verification + `aomi_account_events` cover; the challenge table
returns only with SVM/manual challenge flows.)

```mermaid
erDiagram
  aomi_users ||--o{ aomi_auth_identities : "has"
  aomi_users ||--o{ aomi_wallets : "owns"
  aomi_users ||--o{ aomi_account_events : "logs"
  aomi_users {
    uuid id PK
    text better_auth_user_id
    citext primary_email
    text display_name
    timestamptz deactivated_at
  }
  aomi_auth_identities {
    uuid id PK
    uuid user_id FK
    text provider
    text subject
    citext email
    boolean email_verified
    timestamptz revoked_at
  }
  aomi_wallets {
    uuid id PK
    uuid user_id FK
    text family
    text address
    text normalized_address
    text caip10
    text chain_scope
    text kind
    text linked_via
    timestamptz revoked_at
  }
  aomi_account_events {
    uuid id PK
    uuid user_id FK
    uuid actor_user_id FK
    text event_type
    jsonb data
    timestamptz created_at
  }
```

### 9.1 Extensions & enum strategy

```sql
create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists citext;      -- case-insensitive email
```

Use **check constraints**, not Postgres enums, for the temporary phase (easier to
evolve). Valid values:

```text
wallet_family      : evm | svm
wallet_kind        : external | embedded | smart_account
linked_via         : siwe | siws | privy | para | import | observed | migration
identity_provider  : better_auth | siwe | privy | para | email | google | github | x | discord | telegram | farcaster
```

(`wallet_capability` is intentionally absent — computed live, see §9.4.)

### 9.2 `aomi_users` — the one durable user

```sql
create table if not exists aomi_users (
  id uuid primary key default gen_random_uuid(),
  better_auth_user_id text unique,
  display_name text,
  primary_email citext,
  primary_email_verified boolean not null default false,
  avatar_url text,
  metadata jsonb not null default '{}'::jsonb,
  deactivated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists aomi_users_primary_email_idx
  on aomi_users (primary_email)
  where primary_email is not null and deactivated_at is null;
```

| Column                    | Purpose                                                                                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                      | Canonical owner id. All data keys off this, never an address.                                                                                                                              |
| `better_auth_user_id`     | Pointer to BetterAuth's `user.id`. Nullable (import/staging). A matching `aomi_auth_identities(provider='better_auth')` row is the durable recovery handle; this column is a fast pointer. |
| `primary_email`           | Optional — wallet-only users are `null`. `citext` = case-insensitive.                                                                                                                      |
| `primary_email_verified`  | Only ever set true from a verified provider/SIWE path.                                                                                                                                     |
| `display_name`            | Defaults to a derived short address (`0x12…ab`) until renamed.                                                                                                                             |
| `avatar_url` / `metadata` | Profile; user-editable; never proof.                                                                                                                                                       |
| `deactivated_at`          | Reserved for explicit account closure. Never expose a deactivated user as an active session.                                                                                               |

### 9.3 `aomi_auth_identities` — every login method

```sql
create table if not exists aomi_auth_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references aomi_users(id) on delete cascade,
  provider text not null,
  subject text not null,
  email citext,
  email_verified boolean not null default false,
  auth_method text,
  display_label text,
  provider_metadata jsonb not null default '{}'::jsonb,
  linked_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint aomi_auth_identities_provider_check check (provider in (
    'better_auth','siwe','privy','para',
    'email','google','github','x','discord','telegram','farcaster'))
);

-- one active subject -> one active user (the collision guard)
create unique index if not exists aomi_auth_identities_active_subject_uidx
  on aomi_auth_identities (provider, subject) where revoked_at is null;
create index if not exists aomi_auth_identities_user_idx
  on aomi_auth_identities (user_id) where revoked_at is null;
```

`(provider, subject)` **is** the identity. Examples:

```text
provider = "better_auth", subject = BetterAuth user.id
provider = "siwe",        subject = "eip155:*:0xabc…"
provider = "privy",       subject = "did:privy:…"
provider = "para",        subject = Para user id
```

`revoked_at` makes unlink a soft operation; the partial unique index is the
one-active-owner guard that powers the signal ladder.

### 9.4 `aomi_wallets` — the durable wallet graph

```sql
create table if not exists aomi_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references aomi_users(id) on delete cascade,
  family text not null,
  address text not null,
  normalized_address text not null,
  caip10 text,
  chain_scope text,
  kind text not null,
  provider text,
  provider_wallet_id text,
  linked_via text not null,
  label text,
  display_metadata jsonb not null default '{}'::jsonb,
  verified_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint aomi_wallets_family_check check (family in ('evm','svm')),
  constraint aomi_wallets_kind_check  check (kind in ('external','embedded','smart_account')),
  constraint aomi_wallets_linked_via_check check (linked_via in (
    'siwe','siws','privy','para','import','observed','migration'))
);

create unique index if not exists aomi_wallets_active_wallet_uidx
  on aomi_wallets (family, normalized_address, coalesce(chain_scope, '*'))
  where revoked_at is null;
create index if not exists aomi_wallets_user_idx
  on aomi_wallets (user_id) where revoked_at is null;
create index if not exists aomi_wallets_provider_wallet_idx
  on aomi_wallets (provider, provider_wallet_id)
  where provider is not null and provider_wallet_id is not null and revoked_at is null;
```

| Column                            | Purpose                                                                                                     |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `family`                          | `evm` or `svm`. Drives normalization.                                                                       |
| `address` / `normalized_address`  | Display value vs comparison key.                                                                            |
| `caip10` / `chain_scope`          | `null` for normal EOAs (chain-independent identity). Chain-scoped for smart accounts / future SVM clusters. |
| `kind`                            | `external` (MetaMask) / `embedded` (Privy/Para) / `smart_account`.                                          |
| `provider` / `provider_wallet_id` | For embedded/smart accounts, who issued it.                                                                 |
| `linked_via`                      | How it arrived: `siwe`, `privy`, `para`, `import`, `observed`. Audit/UX, not proof.                         |
| `label`                           | User nickname, max 80 chars.                                                                                |

Normalization (in `wallet-normalization.ts`):

```text
EVM normalized_address = lowercase(address)
SVM normalized_address = exact address   (base58 is case-sensitive)
```

CAIP-10 / chain_scope:

```text
EVM mainnet EOA       : caip10 = eip155:1:0x…   chain_scope = null
EVM Base smart account: caip10 = eip155:8453:0x… chain_scope = eip155:8453
SVM mainnet           : caip10 = solana:mainnet:<base58>  (future)
```

> **No `capability` column.** Read vs write is computed **live** from whether the
> browser currently has a signer for that address — never stored (it would go stale
> instantly). A persisted row only proves the user previously verified control; the
> live wallet runtime upgrades the visible row to write-capable when a signer is
> present.

### 9.5 `aomi_account_events` — append-only account audit

```sql
create table if not exists aomi_account_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references aomi_users(id) on delete set null,
  actor_user_id uuid references aomi_users(id) on delete set null,
  event_type text not null,
  target_type text,
  target_id uuid,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists aomi_account_events_user_idx
  on aomi_account_events (user_id, created_at desc);
```

Event types: `user.created`, `identity.linked`, `identity.conflict`,
`identity.revoked`, `wallet.linked`, `wallet.conflict`, `wallet.label_updated`,
`wallet.revoked`, `provider_token.verified`, `session.created`. We store the
_action_, not the network identity (no raw IP/UA — §18).

### 9.6 Temp Supabase → product-mono mapping (Phase F reference)

```text
Temp Supabase                       product-mono today
----------------------------------  ------------------------------------
aomi_users.id (uuid)                users.id (TEXT/UUID)   (different namespace + type!)
aomi_auth_identities(provider,sub)  auth_identities(wallet_provider, wallet_provider_subject, auth_method, auth_value)
aomi_wallets                        public_keyes + identity_wallets
aomi_account_events                 no equivalent (new audit)
BetterAuth user/session tables      no equivalent

Provider mapping:  siwe -> wallet,  privy -> privy,  para -> para
```

---

## 10. TypeScript structs

### 10.1 Primitives

```ts
export type AomiUserId = string; // UUID
export type BetterAuthUserId = string;
export type WalletFamily = "evm" | "svm";
export type WalletKind = "external" | "embedded" | "smart_account";
export type WalletCapability = "read" | "write"; // computed live, never stored
export type LinkedVia =
  | "siwe"
  | "siws"
  | "privy"
  | "para"
  | "import"
  | "observed"
  | "migration";
export type AuthIdentityProvider =
  | "better_auth"
  | "siwe"
  | "privy"
  | "para"
  | "email"
  | "google"
  | "github"
  | "x"
  | "discord"
  | "telegram"
  | "farcaster";
```

### 10.2 DB row types (server-only, mirror the tables)

```ts
export type DbAomiUser = {
  id: AomiUserId;
  betterAuthUserId: BetterAuthUserId | null;
  displayName: string | null;
  primaryEmail: string | null;
  primaryEmailVerified: boolean;
  avatarUrl: string | null;
  metadata: Record<string, unknown>;
  deactivatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DbAomiAuthIdentity = {
  id: string;
  userId: AomiUserId;
  provider: AuthIdentityProvider;
  subject: string;
  email: string | null;
  emailVerified: boolean;
  authMethod: string | null;
  displayLabel: string | null;
  providerMetadata: Record<string, unknown>;
  linkedAt: Date;
  lastSeenAt: Date;
  revokedAt: Date | null;
};

export type DbAomiWallet = {
  id: string;
  userId: AomiUserId;
  family: WalletFamily;
  address: string;
  normalizedAddress: string;
  caip10: string | null;
  chainScope: string | null;
  kind: WalletKind;
  provider: string | null;
  providerWalletId: string | null;
  linkedVia: LinkedVia;
  label: string | null;
  displayMetadata: Record<string, unknown>;
  verifiedAt: Date;
  lastSeenAt: Date;
  revokedAt: Date | null;
};
```

### 10.3 Wire payload — `GET /api/aomi/account`

```ts
export type AomiAccountResponse =
  | {
      user: AomiUserRef;
      linkedAccounts: LinkedAuthAccount[];
      wallets: AccountWallet[];
      session: {
        betterAuthUserId: string;
        expiresAt?: number;
        fresh?: boolean;
      };
    }
  | { user: null; linkedAccounts: []; wallets: []; session: null };

export type AomiUserRef = {
  id: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
};
export type LinkedAuthAccount = {
  id: string;
  provider: string;
  subject: string;
  email?: string;
  emailVerified?: boolean;
  displayLabel?: string;
  linkedAt?: number;
  lastSeenAt?: number;
};
export type AccountWallet = {
  id: string;
  family: WalletFamily;
  address: string;
  kind?: WalletKind;
  provider?: string;
  providerWalletId?: string;
  chainScope?: string;
  linkedVia: LinkedVia | (string & {});
  label?: string;
  verifiedAt?: number;
  lastSeenAt?: number;
  capability?: WalletCapability; // filled live by the runtime, not the DB
};
```

### 10.4 Frontend contract — `AccountRuntime` (widened)

Current code has `linkWallet?: (accountId: string) => Promise<void>` and no
`updateWallet`. This is the net-new contract:

```ts
export type LinkWalletInput = {
  family: WalletFamily;
  address: string;
  chainId?: number;
};
export type UpdateWalletInput = { walletId: string; label?: string | null };

export type AccountRuntime = {
  status: "disabled" | "loading" | "ready" | "error";
  user?: AomiUserRef;
  linkedAccounts: LinkedAuthAccount[];
  wallets: AccountWallet[];
  refresh: () => Promise<void>;
  linkWallet?: (input: LinkWalletInput) => Promise<void>;
  updateWallet?: (input: UpdateWalletInput) => Promise<void>;
  unlinkWallet?: (walletId: string) => Promise<void>;
};
```

### 10.5 Provider credential (backward-compatible)

```ts
export type AomiAccountCredential =
  | {
      provider: "privy";
      tokenKind: "identity_token" | "access_token";
      providerToken: string;
    }
  | {
      provider: "para";
      tokenKind: "session_jwt";
      providerToken: string;
      keyId?: string;
    }
  | { kind: "cookie" };
```

A parser still accepts today's shapes and infers the kind:

```ts
{
  provider: ("privy", providerToken);
} // -> identity_token (preferred) / access_token
{
  provider: ("para", providerToken);
} // -> session_jwt
{
  kind: ("token", provider, token);
} // -> map to the above
{
  kind: "cookie";
} // -> same-origin BetterAuth cookie
```

so the existing Para/Privy providers keep working untouched.

### 10.6 Verified-token shapes

```ts
export type VerifiedPrivyToken = {
  subject: string; // did:privy:…
  sessionId?: string;
  audience: string;
  issuer: "privy.io";
  expiresAt: number;
  email?: string; // from the identity token
  linkedAccounts?: unknown[];
  rawClaims: Record<string, unknown>;
};

export type VerifiedParaJwt = {
  subject: string; // Para user id
  audience: string;
  expiresAt: number;
  email?: string;
  wallets?: unknown[];
  connectedWallets?: unknown[];
  rawClaims: Record<string, unknown>;
};
```

---

## 11. Environment

```bash
# BetterAuth — BETTER_AUTH_URL must match the portal's ACTUAL origin/port.
# The portal and apps/landing both default to :3000 under `next dev`; pin the
# portal's port (e.g. PORT=3001) so this URL can't silently point at the wrong app.
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3001

# Supabase temporary Postgres (server-side only — never expose to the browser)
DATABASE_URL=postgresql://postgres:...@...:5432/postgres

# BFF proxy upstream (already read by api/[...slug]/route.ts)
AOMI_PROXY_BACKEND_URL=https://api.aomi.dev   # ?? NEXT_PUBLIC_BACKEND_URL ?? https://api.aomi.dev
NEXT_PUBLIC_BACKEND_URL=/

# SIWE
AOMI_AUTH_DOMAIN=localhost:3001          # must match BETTER_AUTH_URL's host:port
AOMI_AUTH_EMAIL_DOMAIN=aomi.dev

# Privy verification (identity token preferred)
PRIVY_APP_ID=...
PRIVY_IDENTITY_JWT_VERIFICATION_KEY=...
PRIVY_JWT_VERIFICATION_KEY=...            # access-token fallback

# Para verification (JWKS)
PARA_API_KEY=...
PARA_JWKS_URL=...

# Cross-site embeds
AOMI_TRUSTED_ORIGINS=https://app.example.com,https://embed.example.com   # OPEN (§22)

# Phase F only — product-mono canonical account bearer
AOMI_ACCOUNT_TOKEN_SECRET=...

# Legacy/current product-mono Para exchange (until the portal path replaces it)
PARA_VERIFY_URL=...
PARA_API_SECRET_KEY=...
```

Rules:

- Only `NEXT_PUBLIC_*` values may reach the browser.
- `DATABASE_URL`, the BetterAuth secret, Privy verification keys, and Para
  JWKS/secret config stay **server-only**.
- Do not use Supabase anon/service keys for auth routes — a Postgres connection is
  enough. (Fresh project, so no `search_path` juggling needed; if the DB is ever
  shared, qualify the schema.)

---

## 12. BetterAuth setup

### 12.1 Dependencies

```bash
pnpm --filter portal add better-auth pg siwe
pnpm --filter portal add -D @types/pg
```

`siwe` builds/parses ERC-4361 messages client-side; `viem` is already present in
the portal.

### 12.2 Server config (`packages/auth/src/better-auth/auth.ts`)

```ts
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { siwe, bearer } from "better-auth/plugins";
import { generateRandomString } from "better-auth/crypto";
import { verifyMessage } from "viem";
import { pool } from "../db/pool";
import { readAccountAuthEnv } from "./env";

const env = readAccountAuthEnv();

export const auth = betterAuth({
  database: pool,
  trustedOrigins: env.trustedOrigins, // OPEN: real embed domains (§22)
  secret: env.betterAuthSecret,
  baseURL: env.betterAuthUrl,
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 }, // 7d, roll daily
  account: {
    accountLinking: {
      enabled: true,
      allowDifferentEmails: false,
      trustedProviders: [],
    },
  },
  plugins: [
    siwe({
      domain: env.siweDomain,
      emailDomainName: env.siweEmailDomain,
      anonymous: true, // wallet-only users
      getNonce: async () => generateRandomString(32, "a-z", "A-Z", "0-9"),
      verifyMessage: async ({ message, signature, address }) => {
        try {
          return await verifyMessage({
            address: address as `0x${string}`,
            message,
            signature: signature as `0x${string}`,
          });
        } catch {
          return false;
        }
      },
    }),
    bearer(), // cross-site embeds use a bearer
    nextCookies(), // must stay last for server-action cookie writes
  ],
});
```

Notes:

- `nextCookies()` must remain last.
- `anonymous: true` allows wallet-only users without email.
- Do not enable forced trusted-provider account linking.
- BetterAuth does not encrypt provider tokens by default — never store raw provider
  tokens in BetterAuth accounts.

### 12.3 Route mount + client

BetterAuth owns `/api/auth/[...all]`; System B's MCP-approval routes were moved to
`/api/mcp-auth/*` in Phase A to free this prefix.

```ts
// apps/portal/src/app/api/auth/[...all]/route.ts
import { auth } from "@aomi-labs/auth/better-auth";
import { toNextJsHandler } from "better-auth/next-js";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const { GET, POST } = toNextJsHandler(auth);
```

```ts
// packages/auth/src/better-auth/auth-client.ts
"use client";
import { createAuthClient } from "better-auth/react";
import { siweClient } from "better-auth/client/plugins";
export const authClient = createAuthClient({ plugins: [siweClient()] });
```

Cookie policy: `SameSite=Lax`, HTTP-only, `Secure` in prod for same-origin;
cross-site embeds carry the bearer instead of a cookie. Rate limiting uses
BetterAuth's built-in limiter.

### 12.4 Table generation

```bash
pnpm exec auth generate    # produces BetterAuth + SIWE walletAddress tables
pnpm exec auth migrate
```

Do not hand-maintain BetterAuth-owned tables. Inspect the generated `walletAddress`
shape locally before writing the mirror query (§14.2) — keep that table-name
knowledge in one helper.

---

## 13. Server API contracts

Every `/api/aomi/*` route validates the session server-side with
`auth.api.getSession({ headers })`. **Never trust a client-provided `userId`.** Do
not inject a Rust account bearer from these routes yet — that is the Phase F job of
the existing proxy.

| Route                              | Purpose                                                                                 |
| ---------------------------------- | --------------------------------------------------------------------------------------- |
| `GET /api/aomi/account`            | Hydrate `AccountRuntime`; ensure an Aomi user exists for the session.                   |
| `POST /api/aomi/provider/exchange` | Verify Privy/Para token, run the signal ladder. (Phase C link; Phase D create session.) |
| `POST /api/aomi/wallets/link`      | Link an additional wallet (runs the ladder).                                            |
| `PATCH /api/aomi/wallets/:id`      | Rename a wallet (≤80 chars; empty clears).                                              |
| `DELETE /api/aomi/wallets/:id`     | Soft-revoke a wallet; **blocked if it is the last login-capable factor**.               |
| `PATCH /api/aomi/account`          | Update display name / avatar (validate lengths, strip control chars).                   |
| `POST /api/aomi/sign-out`          | Clear the BetterAuth session **and** log out the provider SDK (full logout).            |

### 13.1 `GET /api/aomi/account`

Authenticated response:

```json
{
  "user": { "id": "e822d5ad-…", "displayName": "0x12…ab" },
  "linkedAccounts": [
    {
      "id": "0c7…",
      "provider": "siwe",
      "subject": "eip155:*:0xabc…",
      "linkedAt": 1781540000000
    }
  ],
  "wallets": [
    {
      "id": "42…",
      "family": "evm",
      "address": "0xAbC…",
      "kind": "external",
      "linkedVia": "siwe",
      "verifiedAt": 1781540000000
    }
  ],
  "session": { "betterAuthUserId": "…", "expiresAt": 1781543600000 }
}
```

Unauthenticated: `{ "user": null, "linkedAccounts": [], "wallets": [], "session": null }`.

### 13.2 `POST /api/aomi/provider/exchange`

Request:

```json
{ "provider": "privy", "tokenKind": "identity_token", "providerToken": "eyJ…" }
```

or `{ "provider": "para", "tokenKind": "session_jwt", "providerToken": "eyJ…", "keyId": "…" }`.

- With an existing BetterAuth session, verifies the token, runs the ladder for
  the provider subject + its verified email, and links the identity to the
  current Aomi user.
- With no BetterAuth session, the custom BetterAuth plugin (§13.8) verifies the
  token, resolves or creates the BetterAuth user and Aomi user, creates the
  session cookie, and links the identity.

There is no frontend sign-in policy gate: any verified provider token may create
or refresh a session when no account is active, and may link when one is active.

Linked response: `{ "status": "linked", "account": { …AomiAccountResponse… } }`.

Collision:

```json
{
  "status": "conflict",
  "reason": "already_linked_to_another_account",
  "signalType": "identity",
  "error": "already_linked_to_another_account"
}
```

The client does not retry with confirmation. The user must sign into the owning
account to unlink the provider first.

### 13.3 `POST /api/aomi/wallets/link`

```json
{
  "family": "evm",
  "address": "0xAbC…",
  "chainId": 1,
  "nonce": "base64url.payload.hmac",
  "message": "example.com wants you to sign in…",
  "signature": "0x…"
}
```

Server verifies signature + session + nonce + domain + chain id, runs the ladder,
returns `{ "status": "linked" | "noop", … }` or a `409` conflict.

### 13.4 `PATCH /api/aomi/wallets/:id`

`{ "label": "Trading wallet" }`. Rules: session user must own the wallet; empty
string clears; max 80 chars; log `wallet.label_updated`.

### 13.5 `DELETE /api/aomi/wallets/:id`

Soft-revoke (`revoked_at`, never hard delete). Rules: session user must own it; **do
not unlink the last login-capable factor**; embedded provider wallets are allowed to
unlink silently (no asset-stranding block). Log `wallet.revoked`. Response
`{ "status": "revoked" }`.

For SIWE-linked EVM wallets, unlinking also detaches the BetterAuth SIWE binding
for that address: remove matching BetterAuth `walletAddress` and `account`
(`providerId='siwe'`) rows, revoke any matching Aomi
`aomi_auth_identities(provider='better_auth')`, and clear
`aomi_users.better_auth_user_id` when it points at that detached BetterAuth user.
If the BetterAuth user is SIWE-only and has the synthetic wallet email, delete its
sessions and user row too. Otherwise the same wallet can stay "tainted" and log
back into the old Aomi account after unlink.

### 13.6 `PATCH /api/aomi/account`

`{ "displayName": "Aron", "avatarUrl": null }`. Validate lengths, strip control
chars, do not let a display name become an identity proof.

### 13.7 `POST /api/aomi/sign-out` (full logout)

- Clear the BetterAuth session/cookie.
- Clear/rotate the product-mono `X-Session-Id` account binding if it was primed.
- Tell the client to also tear down the provider SDK (Privy/Para) and disconnect
  the wallet. A _wallet disconnect_ must never call this; only an explicit sign-out.

### 13.8 Phase D — provider-token session (BetterAuth custom plugin)

Provider-token sign-in with **no existing session** is a BetterAuth custom plugin
endpoint, not a parallel cookie. Confirm `createAuthEndpoint`, internal-adapter,
and cookie-helper APIs against the installed BetterAuth version first.

```ts
export function aomiProviderAuthPlugin(opts: {
  verifyPrivyToken: (token: string) => Promise<VerifiedPrivyToken>;
  verifyParaJwt: (token: string, keyId?: string) => Promise<VerifiedParaJwt>;
  accountService: AomiAccountService;
}) {
  return {
    id: "aomi-provider-auth",
    endpoints: {
      exchangeProviderToken: createAuthEndpoint(
        "/aomi/provider/exchange",
        { method: "POST" },
        async (ctx) => {
          // 1. validate body   2. verify provider token   3. run the signal ladder
          // 4. find/create BetterAuth user   5. find/create aomi user + link identity
          // 6. create BetterAuth session via internal adapter   7. set cookie
          // 8. return AomiAccountResponse
        },
      ),
    },
  } satisfies BetterAuthPlugin;
}
```

---

## 14. Account service algorithms

### 14.1 Ensure current Aomi user

```ts
async function getOrCreateAomiUserForBetterAuthSession(input: {
  betterAuthUserId: string;
  email?: string | null;
  name?: string | null;
}): Promise<DbAomiUser> {
  // 1. find aomi_users by better_auth_user_id
  // 2. if found, touch updated_at and return
  // 3. else insert aomi_users (display_name = derived short address)
  // 4. ensure aomi_auth_identities(provider="better_auth", subject=betterAuthUserId)
  // 5. log user.created
}
```

### 14.2 Mirror BetterAuth SIWE wallets into `aomi_wallets`

After SIWE sign-in BetterAuth owns the session and its `walletAddress` table. We
mirror into `aomi_wallets` so there is one graph. Keep the table-name knowledge in
one helper:

```ts
export type BetterAuthSiweWallet = {
  betterAuthUserId: string;
  address: `0x${string}`;
  chainId: number;
  isPrimary: boolean;
  createdAt: Date;
};
async function listBetterAuthSiweWallets(
  betterAuthUserId: string,
): Promise<BetterAuthSiweWallet[]>;

async function syncSiweWalletsForUser(input: {
  aomiUserId: AomiUserId;
  betterAuthUserId: string;
}) {
  for (const w of await listBetterAuthSiweWallets(input.betterAuthUserId)) {
    await upsertVerifiedWallet({
      userId: input.aomiUserId,
      family: "evm",
      address: w.address,
      chainScope: null,
      kind: "external",
      provider: "siwe",
      linkedVia: "siwe",
    });
    await linkProviderIdentity({
      userId: input.aomiUserId,
      provider: "siwe",
      subject: `eip155:*:${w.address.toLowerCase()}`, // chain-independent EOA
    });
  }
}
```

### 14.3 Resolve a signal — the ladder (single entry point)

```ts
type SignalRef =
  | {
      type: "wallet";
      family: WalletFamily;
      normalizedAddress: string;
      chainScope: string | null;
    }
  | { type: "identity"; provider: AuthIdentityProvider; subject: string }
  | { type: "email"; email: string };

async function resolveSignal(input: {
  currentUserId: AomiUserId;
  signal: SignalRef;
}): Promise<
  | { status: "linked" }
  | { status: "noop" }
  | {
      status: "conflict";
      reason: "already_linked_to_another_account";
      signalType: SignalRef["type"];
    }
> {
  // 1. ownerId = active owner of signal (via the partial unique index)
  // 2. ownerId is none      -> insert/link to currentUserId, log *.linked       -> "linked"
  // 3. ownerId === current   -> touch last_seen                                  -> "noop"
  // 4. ownerId is another    -> log *.conflict, return conflict, do not mutate
}
```

Hard rule: a signal never moves between active accounts. The only automatic path is
step 2 (unclaimed → link).

### 14.4 Upsert verified wallet & link provider identity

```ts
async function upsertVerifiedWallet(input: {
  userId: AomiUserId;
  family: WalletFamily;
  address: string;
  chainId?: number;
  chainScope?: string | null;
  kind: WalletKind;
  provider?: string | null;
  providerWalletId?: string | null;
  linkedVia: LinkedVia;
  label?: string | null;
}): Promise<DbAomiWallet> {
  // 1. normalize address by family
  // 2. resolveSignal({ type: "wallet", … }) handles ownership/collision
  // 3. on link: insert aomi_wallets row, log wallet.linked
}

async function linkProviderIdentity(input: {
  userId: AomiUserId;
  provider: AuthIdentityProvider;
  subject: string;
  email?: string | null;
  emailVerified?: boolean;
  displayLabel?: string | null;
  providerMetadata?: Record<string, unknown>;
}): Promise<DbAomiAuthIdentity> {
  // resolveSignal({ type: "identity", … }) for the subject;
  // if email present, also resolveSignal({ type: "email", email }) (same ladder);
  // on link: insert aomi_auth_identities, log identity.linked
}
```

### 14.5 Provider verification helpers

```ts
// access_token  -> reuse makePrivyJwtVerifier (requires sid; NO email/linked accounts)
// identity_token -> NEW verifier: no required sid, extracts email + linked_accounts,
//                   uses PRIVY_IDENTITY_JWT_VERIFICATION_KEY
async function verifyPrivyToken(input: {
  token: string;
  tokenKind: "identity_token" | "access_token";
  appId: string;
  verificationKey: string;
}): Promise<VerifiedPrivyToken>; // ES256, iss="privy.io", aud=appId, exp; sub=did:privy:…

async function verifyParaJwt(input: {
  token: string;
  expectedAudience: string;
  jwksUrl: string;
  keyId?: string;
}): Promise<VerifiedParaJwt>; // JWKS (cached, TTL), validate kid/sig/aud/exp; sub=Para user id
```

---

## 15. Auth flows (step by step)

### 15.1 External EVM wallet sign-in (resolve-or-create)

BetterAuth's SIWE plugin already implements resolve-or-create — we do not write it.

```text
User connects an EVM wallet (auto-trigger SIWE on connect)
  -> authClient.siwe.nonce({ walletAddress, chainId })
  -> build ERC-4361 message (domain, uri, version, chainId, nonce, issuedAt)
  -> wallet signs
  -> authClient.siwe.verify({ message, signature, walletAddress, chainId })
  -> BetterAuth: known address -> session for existing user; unknown -> new user + session
  -> GET /api/aomi/account
  -> getOrCreateAomiUserForBetterAuthSession + syncSiweWalletsForUser
  -> AccountRuntime hydrates user + linked wallet
```

Identity subject: chain-independent for EOAs (`eip155:*:0xabc…`); chain-scoped for
smart accounts (`eip155:8453:0x…`). BetterAuth's own `walletAddress` table keeps the
actual chain id.

### 15.2 Linking an additional EVM wallet

```text
User is signed in -> selects "Add another wallet" / connects a new wallet
  -> the NEW wallet signs the SIWE/link challenge (last wallet does NOT re-sign)
  -> POST /api/aomi/wallets/link  (BetterAuth SIWE link path)
  -> resolveSignal: unclaimed -> link; self -> noop; claimed elsewhere -> conflict
```

### 15.3 Privy login / link

```text
Existing session: Privy authenticated in wallet kit -> getCredential()
  -> POST /api/aomi/provider/exchange { provider:"privy", tokenKind:"identity_token", providerToken }
  -> verifyPrivyToken -> linkProviderIdentity(subject=did:privy:…, email from identity token)
  -> resolveSignal runs for both the DID and the verified email -> AccountRuntime refresh
No session: same token hits the custom plugin -> verify -> find/create BetterAuth user
  -> find/create aomi user -> create session -> link identity
```

Record the **identity only** in v1 (no provider wallet import). Never trust a
client-provided Privy `user.id` unless it matches the verified token subject.

### 15.4 Para login / link

```text
Existing session: Para authenticated -> issueJwt() -> POST /api/aomi/provider/exchange
  -> verifyParaJwt (JWKS) -> linkProviderIdentity(subject=Para user id, email if present)
No session: Para token creates a session via the custom plugin
```

Validate `aud` against the Para API key/app id; validate `exp`/`iat`/`kid`/sig.
Record identity only in v1.

### 15.5 Wallet-only user (no email)

Valid state: BetterAuth user with empty/generated email (anonymous SIWE); aomi user
`primary_email = null`, `display_name` derived from address; one `siwe` identity;
one or more verified wallet rows. The UI must never require email.

### 15.6 Disconnect vs sign-out vs reconnect ("remember me")

```text
Disconnect wallet (MetaMask/Privy/Para): cookie stays -> STILL signed in, just can't
  sign transactions until a signer reconnects. (Invariant 9.)
Reconnect the same wallet later: same user, signing restored, NO re-sign (cookie valid).
Explicit "Sign out": full logout -> clears BetterAuth session/cookie AND tears down the
  provider SDK + disconnects the wallet. The only thing that forgets the user.
```

### 15.7 Connected vs linked (UI semantics)

```text
Connected now (live signer):    MetaMask 0x123… (write) · Privy 0x456… (write)
Linked to your account:         MetaMask 0x123… (read/write if connected) · Para 0x789… (read) · Old 0xabc… (read)
```

`write` means the browser can sign now; `read` means linked + verified but not
currently a live signer. Computed live, never from the DB.

---

## 16. Server-side verification details

### 16.1 EVM SIWE

Server must verify: the message parses as ERC-4361; domain equals the configured
domain; nonce equals the server-issued nonce; address equals the submitted address;
chain id equals the submitted chain id; time bounds are valid; the signature
recovers the submitted address. BetterAuth SIWE handles the binding checks; our
custom `verifyMessage` only performs signature recovery.

### 16.2 Privy

ES256; `iss = "privy.io"`; `aud =` configured app id; reject expired tokens; `sub`
is the provider subject; the identity token additionally carries email + linked
accounts. Access token alone proves authentication; identity token is preferred for
email/clustering.

### 16.3 Para

JWKS (fetched + cached with TTL); reject unknown `kid`; validate signature, `aud`,
`exp`; reject missing subject/user id; treat wallet claims as provider-attested,
not live signing capability. Note this does **not** match product-mono's current
verify-URL path (`<auth_type>:<identifier.lowercased()>`); Phase F reconciles.

---

## 17. Frontend integration

### 17.1 Provider config

```ts
export type AccountConfig =
  | false
  | { mode: "disabled" }
  | {
      mode: "aomi-backend";
      baseUrl?: string;
    };

export type AomiWalletKitProviderProps = {
  preset?: "para" | "privy" | "wallets-only";
  providers?: ProvidersConfig;
  auth?: AuthConfig;
  wallets?: WalletsConfig;
  execution?: ExecutionConfig;
  account?: AccountConfig; // NEW — today there is no account prop
  children: ReactNode;
};
```

### 17.2 Account runtime hook

```ts
function useAomiBackendAccountRuntime(input: {
  enabled: boolean;
  baseUrl?: string;
  auth: AuthRuntime;
  evm: EvmWalletRuntime;
  svm?: SvmWalletRuntime;
}): AccountRuntime {
  // 1. load GET /api/aomi/account
  // 2. auto-trigger SIWE when an EVM wallet connects and there is no session
  // 3. if getCredential() exists, exchange the provider token:
  //    existing session -> link; no session -> create/refresh session
  // 4. surface cross-account conflicts as action errors
  // 5. compute live read/write capability from the wallet runtime
  // 6. expose updateWallet/unlinkWallet
}
```

Guard against tight render loops: key the credential exchange on
`provider + subject + token-hash` with an in-flight lock; do not auto-submit in a
render loop. Explicit account sign-out clears prior exchange locks and suppresses
only the exact stale provider credential observed at sign-out until the provider
SDK reports unauthenticated or a different credential/subject appears. A rejected
or failed automatic SIWE attempt is non-fatal: suppress repeat prompts for that
same active wallet, keep `status="ready"`, and still allow provider-token
session creation.

### 17.3 SIWE client action

```ts
async function signInWithActiveEvmWallet(input: {
  address: `0x${string}`;
  chainId: number;
  signMessageAsync: (args: { message: string }) => Promise<`0x${string}`>;
}): Promise<void> {
  const nonce = await authClient.siwe.nonce({
    walletAddress: input.address,
    chainId: input.chainId,
  });
  // build a valid ERC-4361 message (domain, uri, version, chainId, nonce, issuedAt, optional expiry)
  const signature = await input.signMessageAsync({ message });
  await authClient.siwe.verify({
    message,
    signature,
    walletAddress: input.address,
    chainId: input.chainId,
  });
}
```

Use the actual wagmi/viem call shapes from `EvmWalletRuntime` (already exposes
`signMessageAsync`).

### 17.4 Account-management UI

**What's actually on `polish-multi-wallet` today:** the push-nav modal shell and the
data plumbing — `WalletModalRow`/`mergeWalletRows` already carry `status`, `linked`,
`linkedVia`, `capability`, `actions`, and the composer already feeds
`account.wallets` into the rows (it's just always empty because the runtime is the
`DISABLED_ACCOUNT_RUNTIME` stub). The fuller design — green/amber
**Connected/Linked** sections, per-wallet kebab + detail, nicknames
ENS/SNS → "Type N" → "Wallet N" — is **implemented on the backup branch
`backup/account-mgmt-main-based`** (+ `.claude/wallet-account-mgmt-main-based.patch`)
against the old `main`/`aomi-auth-adapter` layout; the work is to **port it onto**
the wallet-kit data model, not a rebuild. (There is no `specs/WALLET-ACCOUNT-MGMT-UI.md`
in the tree — that pointer was stale.)

v1 UI work:

- Feed the real `account` runtime from the composer into `AomiWalletKit` (replacing
  `DISABLED_ACCOUNT_RUNTIME`); wire `account.user` / `account.linkedAccounts`, not
  just `account.wallets`.
- Rename (≤80), unlink (block last login-capable factor), full sign-out.
- Distinguish connected-now vs linked; compute capability live.

Do not show explanatory paragraphs in the compact widget — concise row labels,
statuses, icons/tooltips.

---

## 18. Security rules

- Server-side session validation on every `/api/aomi/*` route; never trust a
  client `userId`.
- A signal never moves between active accounts; cross-account collisions return a
  conflict.
- Last login-capable factor unlink is blocked.
- BetterAuth built-in rate limiting on nonce / verify / exchange / link / unlink.
- No raw provider tokens in logs or Aomi tables — verify, extract, discard.
- Cookies HTTP-only, `Secure` in prod, `SameSite=Lax`; bearer for cross-site.
- Explicit `trustedOrigins` + CORS policy for cross-site embeds; origin checks on
  custom plugin endpoints; CSRF via BetterAuth's cookie handling.
- No IP/UA storage in v1 — `aomi_account_events` logs the _action_, not the network
  identity.
- Wallet/provider/email collisions are never auto-moved or merged.

---

## 19. Phases — agent-followable checklists

```mermaid
flowchart LR
  P0["PR 0 · walletKey fix"] --> A["A · Foundation"] --> B["B · SIWE sign-in"]
  B --> C["C · Provider link"] --> D["D · Provider sessions"] --> E["E · Account UI + ladder"]
  E --> F["F · Backend (team)"]
```

### PR 0 — standalone, no backend (ship first)

- [x] Replace `walletKey` with family-aware normalization in
      `apps/registry/src/lib/wallet-kit/wallet-utils.ts:5` (it currently lowercases
      **both** families — EVM stays lowercase, SVM must preserve exact case; the SVM
      lowercasing is the bug). Audit the blast radius: `accounts.ts` and
      `composer/merge-wallet-rows.ts` also lowercase keys.
- [x] Add `normalizeWalletAddress(family, address)` helper.
- [x] Tests: EVM compares case-insensitively; SVM preserves case; mixed-case SVM
      addresses do not collide; stored wallets merge only on exact SVM match.
- [x] `pnpm --filter @aomi-labs/widget-lib exec vitest run`.

### Phase A — Foundation

- [x] Relocate System B into `packages/auth/src/mcp-approvals/` (move
      `api/ routes/ providers/ secret-store/ store/`); keep `makePrivyJwtVerifier`
      exported.
- [x] Move System B's portal routes from `/api/auth/*` to `/api/mcp-auth/*`
      (`begin`, `{privy,dummy}/{start,callback}`, `await/[state]`) and update the
      mcp-core + BE callers; this frees `/api/auth/[...all]` for BetterAuth.
- [x] Create the fresh Supabase project; set `DATABASE_URL` (server-only).
- [x] Add `packages/auth/src/better-auth/{auth,auth-client,env,siwe}.ts` with SIWE +
      bearer plugins (§12).
- [x] Add `packages/auth/src/db/{pool,schema.sql,queries}.ts`; run the `aomi_*`
      migration (§9) and `pnpm exec auth migrate` for BetterAuth tables.
- [x] Mount `apps/portal/src/app/api/auth/[...all]/route.ts`.
- [x] Add `GET /api/aomi/account` + `getOrCreateAomiUserForBetterAuthSession`.
- [x] Widen `AccountRuntime`/`AccountWallet` types (§10.4); add `account?` prop to
      `AomiWalletKitProvider`.
- [x] Verify: `pnpm --filter portal type-check && pnpm --filter portal test`.

### Phase B — EVM SIWE sign-in

- [x] Frontend SIWE helper using the real `EvmWalletRuntime.signMessageAsync` (§17.3).
- [x] `useAomiBackendAccountRuntime`: auto-trigger SIWE on EVM connect; hydrate
      after verify.
- [x] `syncSiweWalletsForUser`: mirror the BetterAuth wallet into `aomi_wallets`
      (`linked_via="siwe"`, chain-independent subject) + the `siwe` identity.
- [x] Account menu shows the signed-in user + linked wallet (live data).
- [ ] Manual QA: connect → sign → refresh (still signed in) → disconnect (still
      signed in) → reconnect (same user) → full sign-out.

### Phase C — Privy / Para linking

- [x] `POST /api/aomi/provider/exchange` (requires a session).
- [x] Privy identity-token verifier (reuse `makePrivyJwtVerifier`); Para JWKS verifier.
- [x] `resolveSignal` for the provider subject + its verified email; record identity
      only (no provider wallet import).
- [x] Refresh `AccountRuntime` after exchange.
- [ ] Manual QA: Privy/Para login after SIWE links the identity; verified-email
      collision surfaces the warning; no raw tokens in logs/DB.

### Phase D — Provider-token sessions

- [x] Confirm the installed BetterAuth version's `createAuthEndpoint` /
      internal-adapter / cookie-helper APIs.
- [x] Implement `aomiProviderAuthPlugin` (§13.8): verify → find/create BetterAuth
      user → find/create aomi user → create session + cookie → link identity.
- [x] Frontend: when no session exists, call the plugin endpoint for any
      verified provider credential.
- [ ] Manual QA: Privy-only and Para-only logins (no SIWE) create a session.

### Phase E — Account UI + conflict policy

- [x] Port the locked account-management UI onto the live runtime.
- [x] Cross-account wallet/provider/email collisions return conflict instead of
      moving or merging accounts.
- [x] Rename (≤80), unlink with last-login-capable-factor guard, full sign-out.
- [x] Connected-vs-linked sections; live read/write capability.
- [x] Write `aomi_account_events` on link/revoke/conflict.

### Phase F — Backend ownership (handed to the Rust team)

- [ ] Add the `/api/account/exchange` compatibility alias (path mismatch).
- [ ] Pick the id-mapping approach — **lean: unify the databases** so
      `aomi_users.id` and product `users.id` are the same (§20). Note the type gap:
      product `users.id` is **TEXT holding a UUID**, not native `uuid`.
- [ ] Portal mints the account bearer (§5.1) once ids line up; proxy injects it —
      this is what finally gives SIWE/wallet-only users a real Rust session.

---

## 20. Build-without-the-Rust-team boundary + handoff

~85–90% ships on the portal + your Supabase alone, because the account layer is
additive and Rust is untouched in v1.

| Buildable now (portal + your Supabase)              | Needs the backend team (Phase F)                 |
| --------------------------------------------------- | ------------------------------------------------ |
| BetterAuth + SIWE sessions, resolve-or-create       | Rust trusting a portal-minted account bearer     |
| `aomi_users / identities / wallets / events`        | Unified per-account thread list                  |
| The signal policy (link / noop / conflict / revoke) |                                                  |
| Privy/Para verify + provider-token sessions         | `aomi_users.id` ↔ product `users.id` unification |
| `GET /api/aomi/account` + account CRUD              | the `/api/account/exchange` alias (small)        |
| `AccountRuntime` wired → full account UI            |                                                  |
| `walletKey` fix, bearer plugin, cross-site          |                                                  |

**Handoff contract to the backend team (Phase F):**

1. **Mint:** the account bearer in §5.1, signed with `AOMI_ACCOUNT_TOKEN_SECRET`.
2. **Map (lean):** unify the DBs so `sub` is a real product `users.id`. Alternatives
   if not: sync ids into product-mono, or add a Rust subject namespace + mapping.
3. **History:** sessions are already account-owned (`sessions.user_id`); account
   linking does not transfer history between active accounts. No new `threads`
   table.

> "Without backend" means without the **Rust** backend. The portal's Next.js routes
>
> - Supabase **are** a backend, and BetterAuth runs there server-side.

---

## 21. Testing plan

### 21.1 Unit

- Wallet normalization: EVM lowercases; SVM exact; mixed-case SVM does not collide.
- Ladder/linking policy: unclaimed → link; claimed-by-self → noop;
  claimed-elsewhere → `conflict`; last-login-capable-factor unlink blocked.
- Provider verification: Privy wrong `aud` / expired / mismatched `sub` reject; Para
  unknown `kid` / wrong `aud` / expired reject.

### 21.2 Route

- `GET /api/aomi/account` unauthenticated → empty; authenticated → creates an aomi
  user.
- Provider exchange requires a session (Phase C); links identities; surfaces
  collisions.
- Phase D plugin creates a session from a verified Privy and from a verified Para.
- Wallet `PATCH` requires ownership; `DELETE` soft-revokes; last-factor `DELETE`
  blocked.

### 21.3 Integration

- Full SIWE sign-in with a **deterministic test keypair** (real signatures).
- Refresh preserves the session and aomi user id.
- Provider exchange hydrates linked identities.
- `AccountRuntime` rows merge live + stored wallets (connected vs linked).
- A red-case confirmed move closes the other account and logs the events.

CI uses an **ephemeral Postgres** container (hermetic, no Supabase network
dependency).

### 21.4 Manual QA

Fresh browser (no session) → SIWE sign-in → refresh → disconnect → reconnect (same
user) → full sign-out → sign in again (same wallet) → link a 2nd wallet → connect a
wallet already on another test account (see yellow, then red) → Privy login after
SIWE → Para login after SIWE → Phase D Privy-only / Para-only session → rename a
wallet → unlink a non-last wallet → attempt to unlink the last login-capable factor
(blocked).

- [x] CLI E2E with ephemeral Postgres: SIWE sign-in/session hydrate, wallet rename,
      unlink guards, red merge, Privy link/session, Para link/session, invalid-token
      rejects, sign-out.
- [x] Live Privy demo email login: real email OTP created an embedded wallet in the
      widget.
- [ ] Live Para demo email login: real email OTP was delivered, but the in-app
      browser cannot complete Para's cross-origin OTP iframe/portal control.

---

## 22. Open items (data, not design)

- **`trustedOrigins` / embed-domain list** — the real host domains for cross-site
  embeds. Needed before cross-site ships; `env.ts` has a marked slot
  (`AOMI_TRUSTED_ORIGINS`).
- **Phase F id-mapping final pick** — parked; leaning DB unification. Concrete snag
  for the backend team: product `users.id` is **TEXT (UUID value)** while
  `aomi_users.id` is native `uuid`, so the unify/sync needs a type alignment.

---

## 23. Decisions log (locked 2026-06-17)

- **Scope:** full `aomi_*` core schema (users, identities, wallets) **+**
  `aomi_account_events`; **drop** proofs + challenges. Provider-token sessions in
  v1. Keep + expand the existing account UI.
- **Identity:** separate `aomi_users.id` mirroring BetterAuth user; EVM identity
  chain-independent for EOAs, chain-scoped for smart accounts; wallet-only
  anonymous users allowed; display name derived from address.
- **Sessions:** BetterAuth + bearer plugin from day one; 7-day rolling-daily
  session; code in `packages/auth`.
- **Tokens:** bearer 15 min; in v1 only Privy/Para users get an account bearer (via
  the existing exchange, Rust mints it) — SIWE/wallet-only users are Rust-anonymous
  until Phase F, when the portal mints + injects the bearer for everyone; re-sign
  only when linking a new wallet (new wallet signs).
- **Login/UX:** auto-trigger SIWE on connect; anonymous use is **ephemeral**
  (no claim); different-wallet connect → auto-link if unclaimed; sign-out is a full
  logout (incl. provider SDK).
- **Providers:** Privy identity token; Para JWKS; record identity only (no provider
  wallet import yet).
- **Linking/collision:** the signal policy (§6) — unclaimed auto-links; self is
  noop/refresh; collisions return conflict and require unlinking or closing the
  owning account first; email follows the same rule; extra EVM wallets via
  BetterAuth's SIWE link.
- **SVM:** out of v1 (model stays SVM-safe); `walletKey` fix shipped standalone;
  connected SVM wallet shown read-only.
- **Wallets:** no persisted `capability` (computed live); UI separates
  connected-vs-linked.
- **Account UI guards:** label ≤80; last login-capable factor unlink blocked;
  embedded-wallet unlink allowed silently.
- **Embedding/security:** cross-site supported now; cookie `SameSite=Lax` + bearer
  cross-site; BetterAuth built-in rate limiting; no IP/UA audit storage.
- **Backend/Phase F:** id-mapping deferred (lean: unify DBs; product `users.id` is
  TEXT/UUID); add the `/api/account/exchange` alias now; clean start (no user
  migration). product-mono sessions are **already account-owned** (`sessions.user_id`)
  — Phase F re-keys `sessions.user_id` on merge, no new `threads` table.
- **Auth mount:** BetterAuth owns `/api/auth/[...all]`; System B's MCP-approval
  routes move to `/api/mcp-auth/*` (Phase A; coordinate mcp-core + BE callers).
- **Packaging/ops/testing:** relocate System B first; fresh Supabase project; test
  SIWE with a deterministic keypair; ephemeral Postgres in CI.

---

## 24. Implementation notes by file

```text
packages/auth/src/mcp-approvals/*                  # relocated System B (Phase A)
packages/auth/src/better-auth/{auth,auth-client,env,siwe}.ts
packages/auth/src/db/{pool,schema.sql,queries}.ts
packages/auth/src/service/{account-service,wallet-normalization,provider-exchange,siwe-mirror}.ts
packages/auth/src/providers/{privy,para}.ts
packages/auth/src/types.ts

apps/portal/src/app/api/auth/[...all]/route.ts
apps/portal/src/app/api/aomi/account/route.ts
apps/portal/src/app/api/aomi/provider/exchange/route.ts
apps/portal/src/app/api/aomi/wallets/[id]/route.ts
apps/portal/src/app/api/aomi/sign-out/route.ts
apps/portal/package.json

apps/registry/src/lib/wallet-kit/config/types.ts            # AomiWalletKitProviderProps.account
apps/registry/src/lib/wallet-kit/config/AomiWalletKitProvider.tsx
apps/registry/src/lib/wallet-kit/account/types.ts           # AccountRuntime widening
apps/registry/src/lib/wallet-kit/account/aomi-backend-runtime.ts   # new
apps/registry/src/lib/wallet-kit/wallet-utils.ts            # walletKey fix (PR 0)
apps/registry/src/lib/wallet-kit/wallet-utils.test.ts
```

Regenerate registry artifacts (`pnpm run build:registry` + sync
`apps/registry/dist` → `apps/landing/public/r/`) if files under
`apps/registry/src/lib/wallet-kit` are added to the registry export surface.
