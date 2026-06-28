# Wire contract — account-scoped wallet selection

**Status:** locked 2026-06-25; implemented both sides 2026-06-26. Pairs with the
BE DbThread unification
(`product-mono:docs/superpowers/plans/2026-06-25-dbthread-unification.md`).

**Implementation note (2026-06-26):** the BE went one step further than Clause 3
— it dropped the per-turn `authorized_wallet_ref` request param entirely and now
resolves the operating wallet from account grants in the thread context
(`WalletResolver::resolve(user_id, snapshot)`). So the client neither pins a ref
nor declares a sign-mode. Consequence on the FE: the authorized-wallet
*selection* surface (`operatingWalletRef`, `account auth use/current/clear`, the
chat `authorized_wallet_ref` param) was **removed** as dead weight — see the
revised Clause 3 below.

Selection of which wallet operates is **account-scoped**, never app-scoped.
Identity is the account (`users.id`). In the pink→blue→yellow model:

- **pink** = wallet provider (`auth_identities.wallet_provider`): `privy` | `para`
- **blue** = address (`identity_wallets`, account-scoped, no app column)
- **yellow** = chain/family, derived: `evm` | `svm`

The leak this contract removes is the `application` segment that today rides
the `wallet_ref` and filters the authorization lookup. `app` is the _only_
part of these identifiers that is not one of the three axes.

---

## Clause 1 — `wallet_ref` format

```
provider:family:approval_id        e.g.  privy:svm:42   privy:evm:9
```

- `provider` — pink. The provider that signs (`auth_identities.wallet_provider`).
- `family` — yellow. `evm` | `svm`. Disambiguates _which derived address_ of a
  grant is meant: one approval can yield both an EVM and an SVM candidate.
- `approval_id` — the `access_approvals` row (the account-scoped delegation grant
  holding the signing handle, e.g. privy's 0xQuorumKey).

Dropped vs prior (`provider:app:family:approval_id`): the `app` segment.
`approval_id` is account-unique, so the ref is account-scoped. The CLI treats it
as opaque; `provider`/`family` are kept in the string only so the CLI can
render/group without a round-trip.

## Clause 2 — `GET /api/account/authorizations`

- **Request:** drop `?app=`. Keep `?provider=` (default `privy`).
- **Response:** `{ wallets: AuthorizedWallet[] }`, account-scoped, where
  `AuthorizedWallet` **drops `application`**:

  ```
  wallet_ref, wallet_provider, family, address, label,
  auth_identity_id, approval_id, expires_at
  ```

## Clause 3 — operating wallet: address rides UserState, delegation rides the ref

| Wallet kind                          | Operating **address** (blue→yellow)                             | **Signing** selection (blue→pink)                                                                         |
| ------------------------------------ | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| connected / sync (metamask, para)    | `UserState.evm.address` / `svm.address` + `connection.provider` | none — `authorized_mode=false`, client signs                                                              |
| authorized / async (privy-delegated) | same — address in `UserState`                                   | `authorized_wallet_ref` (Clause 1) → `authorized_mode=true`; BE resolves grant→signing key and auto-signs |

**Revised by implementation (2026-06-26):** the operating *address* (blue→yellow)
rides `UserState`, hydrated by the FE from the connected/sync wallet and captured
durably in the thread's `user_state` snapshot. The *signer* (blue→pink) is
resolved entirely by the BE from the account's grants — there is no client pin
and no `authorized_wallet_ref` request param. The FE therefore carries **no
authorized-wallet selection**: `operatingWalletRef` and `account auth
use/current/clear` are gone; authorized wallets are surfaced read-only via
`aomi wallet authorized`.

## Clause 4 — scheduled intents drop the per-intent wallet

- Drop `authorized_wallet_ref` from the scheduled-intent wire shape **and** the
  `scheduled_intents.authorized_wallet_ref` column.
- Keep `requires_authorization` (derived): an intent that fires offline can only
  use a delegated signer.
- A fired intent forks a **child thread** that recovers its operating wallet from
  the parent thread's persisted context — not from a column on the intent.

---

## Encoding map

**CLI (`aomi-widget`, this repo)** — `packages/client`, done:

- `types.ts` — `AomiAuthorizedWallet` dropped `application`; scheduled wire is
  `AomiScheduledThread { …, root_thread_id, requires_authorization }` (renamed
  from `AomiScheduledIntent`, dropped `authorized_wallet_ref`).
- `client.ts` — `listAuthorizedWallets` dropped `app`; chat dropped the
  `authorized_wallet_ref` param; `listScheduledThreads` reads `scheduled_threads`.
- `cli/user-state.ts` — `buildCliUserState` derives family from the address, not
  the app name (the last app-scoping leak).
- selection removed — `operatingWalletRef`, `account auth use/current/clear`, and
  the chat ref param are gone; `wallet authorized` lists delegated wallets
  read-only.

**BE (`product-mono`, dbthread line)** — done:

- `authorization/types.rs` — `wallet_ref(provider, family, approval_id)`, no app;
  `AuthorizedWalletCandidate` dropped `application`.
- `authorization/repository.rs` + `resolver.rs` — account-scoped lookup;
  `WalletResolver::resolve(user_id, snapshot)` picks the account's authorization
  (no per-turn pin, no app).
- `endpoint/account/authorizations.rs` — `?provider=` only.
- `endpoint/thread/chat.rs` — no `authorized_wallet_ref` request param.
- scheduling folded onto `threads` (DbThread); `scheduled_intents` table dropped;
  wire is `scheduled_threads` / `root_thread_id`, path `/scheduled-intents` kept.
