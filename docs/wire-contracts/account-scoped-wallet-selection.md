# Wire contract — account-scoped wallet selection

**Status:** locked 2026-06-25. Pairs with the BE DbThread unification
(`product-mono:docs/superpowers/plans/2026-06-25-dbthread-unification.md`).

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

`authorized_wallet_ref` is **not** removed — it is narrowed to "which delegation
signs". It is no longer a per-app identity hint: once selected, the BE persists
the selection into thread context (`sessions.active_identity_wallet_id` +
`sessions.user_state` snapshot), so it survives offline resume without being
re-sent. On the CLI this collapses per-app `authorizedWalletRefsByApp` into one
account-scoped `operatingWalletRef`.

## Clause 4 — scheduled intents drop the per-intent wallet

- Drop `authorized_wallet_ref` from the scheduled-intent wire shape **and** the
  `scheduled_intents.authorized_wallet_ref` column.
- Keep `requires_authorization` (derived): an intent that fires offline can only
  use a delegated signer.
- A fired intent forks a **child thread** that recovers its operating wallet from
  the parent thread's persisted context — not from a column on the intent.

---

## Encoding map

**CLI (`aomi-widget`, this repo)** — `packages/client`:

- `types.ts` — `AomiAuthorizedWallet` drop `application`; `AomiScheduledIntent`
  drop `authorized_wallet_ref`.
- `client.ts` — `listAuthorizedWallets` drop `app`.
- `cli/state.ts` + `cli/cli-session.ts` — `authorizedWalletRefsByApp` →
  `operatingWalletRef` (account-scoped); accessor/mutators lose the `app` arg.
- `cli/commands/authorizations.ts` — account-scoped; `formatWallet` drops
  `application`.
- `cli/commands/chat.ts` — source `authorizedWalletRef` from `operatingWalletRef()`.
- `cli/commands/schedule.ts` — drop the `authorized wallet` print line.
- `cli/commands/defs/account.ts` — help text loses "for this app".

**BE (`product-mono`)** — paired, coordinate before editing #667's module:

- `aomi/crates/tools/src/authorization/types.rs` — `wallet_ref()` drops
  `application_key`; `AuthorizedWalletCandidate` drops `application`.
- `authorization/repository.rs` + `resolver.rs` — stop filtering identities by
  `application` (account-scoped lookup).
- `endpoint/account/authorizations.rs` — drop `app` query param.
- `endpoint/session/chat.rs` — `authorized_wallet_ref` stays (async selector).
- `endpoint/account/scheduled_intents.rs` + `scheduled_intents.{rs}` + schema —
  drop `authorized_wallet_ref` column/field.
