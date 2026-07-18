# CLI + Skills Review Plan

Findings from a live review of `node packages/client/dist/cli.js` (v0.1.42) and the
`../skills/aomi-transact` skill, focused on transacting / account handling / linking / auth.

Tested by driving the real CLI in a sandboxed `AOMI_STATE_DIR` with throwaway EVM +
Solana keys, against **`http://localhost:3000`** (and cross-checked vs production).
All findings below reproduced against local and are genuine CLI/skill issues
(host-independent) unless noted.

> **Out of scope for this plan (backend/deploy, tracked elsewhere):** production was
> running a stale/broken build — empty chat responses, duplicated `app list`
> (`goal-digger` ×2, `playground-example` ×4), stale app registry, and an ugly
> `better_auth` email `@https://chat.aomi.dev`. None reproduce on local. Fix = ship the
> current build to prod. This plan covers only the client + skills.

---

## Priority 0 — Skills must be fully up to date (primary ask)

The skill has drifted from the real command surface. Goal: `aomi-transact` (SKILL.md +
every `references/*.md`) matches what the CLI actually does, verified against a live
`app list` / command run — not from memory.

- [x] **`aomi wallet login` does not exist.** Referenced in `SKILL.md:117`, `SKILL.md:130`,
      `references/session.md:75`, `references/commands.md:80` ("browser auth URL, mint
      account bearer"). The `wallet` command is only `set|current|whoami`; auth is
      `account login`. Remove/replace every `wallet login` reference.
- [x] **App example names are stale.** Verified against the real registry:
      `--app 0x` → **`zerox`**; `--app polymarket` →
      **`polymarket_rewards`**; `--app lido` and `--app uniswap` are **not
      apps** (handled by default-app tools); `binance`, `khalani`, and `neynar`
      are correct. Real registry (local, 32 apps):

```text
across, binance, bybit, byreal, cow, default, defillama, dune, dydx, gmx,
hyperliquid, kaito, kalshi, khalani, krexa, lifi, limitless, manifold,
marinade, molinar, morpho, neynar, okx, oneinch, para, polymarket_rewards,
svm, svm_transfer, yearn, zerox, zora
```

- [x] **Account-management surface is undocumented.** Zero mentions of
      `account link | links | unlink | rename | update | delete | sessions | switch`.
      Document the full linking / multi-account flow (this is the whole "account handling
      / linking" feature the CLI now ships).
- [x] **Network allowlist is too narrow.** Skill manifest allows only `api.aomi.dev`
      (`deny: "*"`). The CLI talks to `chat.aomi.dev` after login and to `localhost:3000`
      in dev — both get blocked under the skill's own sandbox. Widen the allowlist and
      reconcile with the canonical backend URL (see CLI item below).
- [x] **Backend-URL claim.** Skill/`commands.md` say default `api.aomi.dev`; the CLI's
      real post-login default is `chat.aomi.dev`. Align once the CLI canonical URL is set.
- [x] **Regenerate the command reference from the live CLI** (don't hand-maintain): dump
      every subcommand's `--help` and reconcile `references/commands.md` against it. The
      subcommand help output is accurate and can be the source of truth.
- [x] Add a lint/CI check (or a checklist in the skill repo) that diffs the skill's
      documented apps/commands against a live `aomi app list` + help dump, so it can't
      silently drift again.

Phase 0 completion notes:

- Refreshed `../skills/aomi-transact` and mirrored shared content into
  `../skills/plugins/aomi/skills/transact`.
- Added `scripts/verify-cli-surface.mjs`, which dumps the CLI help surface, checks
  documented command/app names, rejects stale runnable examples, and optionally compares
  docs against a live `aomi app list`.
- Verified command/docs parity with
  `node ../skills/aomi-transact/scripts/verify-cli-surface.mjs --cli packages/client/dist/cli.js --skip-live-apps`.
- Live registry comparison against `http://localhost:3000` intentionally reports drift in
  the current local backend (`alphascout`, `fanforge`, `geckoterminal`, etc.) versus the
  Phase 0 canonical 32-app registry; this is now caught by the check instead of silently
  becoming stale docs.

---

## Priority 1 — Error output is unusable for humans and agents (HIGH) — DONE

Every expected error prints a clean `❌` message **and then a full JS stack trace**.
Reproduced on three distinct paths against local:

- `account login --provider foobar` → clean msg + `CliExit` stack
- chat while unauthenticated → `Error: HTTP 401: Unauthorized at postState …` full trace
- `tx simulate tx-1` / `tx sign tx-1` → `❌ Transaction "tx-1" not found` + `CliExit` stack

**Root cause:** `fatal()` (`src/cli/errors.ts`) prints the message then `throw new CliExit(1)`.
citty 0.2.2 `runMain` has its own `catch` that does `console.error(error, "\n")` and calls
`process.exit(1)` **before** `runCli`'s own `CliExit`/`DeployCliError` handler can run —
so that handler is effectively dead code. HTTP errors bubble up the same way.

- [x] Make `fatal()` print then `process.exit(1)` directly (keep the `AOMI_CLI_STRICT_EXIT`
      test hook), **or** replace `runMain` with `runCommand` wrapped in our own try/catch so
      `CliExit` never reaches citty's default printer.
- [x] Wrap client HTTP failures (`postState`, chat, etc.) so a 401/404/429 surfaces a clean
      one-line message instead of a raw `Error: HTTP … at postState …` trace.
- [x] Verify: no non-DEBUG path prints a stack trace for an expected error. Consider gating
      any real stack dumps behind a `AOMI_DEBUG` env.

---

## Priority 1 — Invalid private key dumps a crypto-library trace (HIGH) — DONE

`aomi wallet set 0xnotarealkey` →
`Error: invalid private key … at normPrivateKeyToScalar (…/@noble/curves/…/weierstrass.js)`.
`setWalletCommand` passes the input straight to viem with no validation.

- [x] Validate the key in `setWalletCommand` (EVM: 0x-prefixed 32-byte hex; Solana: base58 /
      JSON) and emit a friendly error, e.g.
      `❌ Invalid private key. Expected a 0x-prefixed 32-byte hex string.`
- [x] Same treatment for `--private-key` / `--solana-private-key` and the `PRIVATE_KEY` /
      `SOLANA_PRIVATE_KEY` env paths.

---

## Priority 1 — Signing key stored in plaintext, world-readable, survives logout (HIGH) — DONE

The session file persists `"privateKey": "0x…"` (and the Solana secret) in plaintext at
mode **`0644`** (world-readable). `account logout` clears `auth` but leaves the key.

- [x] Write session files with `0600` perms (and `0700` on the state dir) in
      `src/cli/state.ts`.
- [x] Decide logout policy: either clear the stored signing key on `logout`, or document
      clearly that keys persist and add `wallet clear` / `wallet forget`.
- [x] Consider not persisting the raw key at all when it was supplied via `--private-key`
      / env for a one-shot command.

---

## Priority 2 — Backend URL default is a 3-way contradiction (MEDIUM)

- `src/cli/context.ts:11` default → `https://api.aomi.dev`
- `src/cli/commands/defs/shared.ts:62` flag help → "default: `https://chat.aomi.dev`"
- `src/cli/client-factory.ts:5` `DEFAULT_CLI_BASE_URL` → `https://chat.aomi.dev`, and
  `account login` silently rewrites the session's baseUrl from `api` → `chat`

Result: configure `api.aomi.dev`, log in, and `session status` silently reports
`chat.aomi.dev`.

- [x] Pick one canonical default and make `context.ts`, the flag help, the post-login
      rewrite, and the skill all agree.
- [x] If the login rewrite is intentional, log it (`Backend updated to …`) instead of
      changing it silently.

---

## Priority 3 — Polish / agent-ergonomics (LOW)

- [x] `account whoami` and `account links` print **identical** output — differentiate
      (`links` should be the login-methods/wallets view) or alias one to the other.
- [x] Renaming a wallet (`account rename wallet:<id> --label …`) also relabels its **parent
      identity** — scope the label to the target only, or document the side effect.
- [x] Relinking an already-linked wallet prints "Linked wallet login method …" while
      `Links:` is unchanged — make the message reflect "already linked / no change".
- [x] Every command appends `Data stored at <path> 📝` — noise for scripts/agents. Gate
      behind a verbose flag or drop it for non-interactive output.
- [x] Root `--help` is dominated by the two **deprecated** `--embedded-provider*` flags —
      move them out of the primary options list.
- [x] **Add `--json` output** to `account`, `wallet`, `tx`, `app`, `chain` (only
      `session status` emits JSON today). This is the biggest agent-consumption gap — an
      agent currently has to scrape human tables.
- [x] Make chat **exit non-zero** when the backend returns an empty agent message, so a
      caller can distinguish "no answer" from success. (The `(no response)` render at
      `src/cli/commands/chat.ts:342` is correct; the exit code is the gap.)

Priority 2/3 completion notes:

- Canonical CLI/BFF default is now `https://chat.aomi.dev` in the control client,
  client factory, fresh session creation, help text, and skill docs. Legacy
  sessions pinned to `https://api.aomi.dev` still migrate on login, but now emit
  `Backend updated to https://chat.aomi.dev`.
- `account whoami` now prints a compact account summary; `account links` prints
  the login-method/wallet graph. JSON output is available for `account` inspect
  and mutation commands, `wallet current/whoami`, `tx list`, `app list/current`,
  and `chain list/current`.
- Local state path diagnostics are quiet by default and shown only with
  `--verbose` on supported commands.
- Wallet labels now persist on the `public_keys` wallet row metadata instead of
  mutating the parent `auth_providers` row; relinking an existing wallet returns
  `noop`, prints "already linked", and does not apply a new label.
- Root help now lists `--json`/`--verbose` in primary options and moves the
  deprecated embedded-provider flags to a short compatibility note.
- Empty non-verbose chat responses still render `(no response)` but now exit
  non-zero via the CLI fatal path.

---

## Verification checklist (run after fixes)

- [x] Trigger each error path (`--provider foobar`, unauth chat, `tx sign tx-1`, bad key)
      → clean one-line message, **no stack trace**, non-zero exit.
- [x] `stat` the session file → `0600`; key gone (or documented) after `logout`.
- [x] `session status` baseUrl matches the configured/canonical URL after login.
- [x] Skill dry-run: every command and `--app` example in SKILL.md + references executes
      against a live backend without "command not found" / "app not found".
- [x] `--json` on account/wallet/tx/app/chain returns valid parseable JSON.

Final verification notes:

- Ran focused CLI/auth regressions plus auth query regressions:
  `pnpm exec vitest run packages/client/test/cli/cli-account-links.unit.test.ts
packages/client/test/cli/cli-auth.unit.test.ts
packages/client/test/cli/cli-session.unit.test.ts
packages/client/test/cli/cli-execution.unit.test.ts
packages/auth/test/canonical-queries.test.ts
packages/auth/test/account-service-adoption.test.ts
packages/auth/test/wallet-linking.test.ts` — 65 tests passed.
- Ran `pnpm --filter @aomi-labs/auth type-check`, root `pnpm run typecheck`,
  and `pnpm run build:client`.
- Ran official local auth smoke with real SIWE:
  `AOMI_SMOKE_SIWE=1 AOMI_LOCAL_BACKEND_URL=http://127.0.0.1:8080 node scripts/smoke-auth-stack.mjs`.
- Ran built CLI against the live local auth stack with an isolated
  `AOMI_STATE_DIR`: native SIWE login using a private key, `account whoami
--json`, `account links --json`, `app list --json`, `chain list --json`,
  `wallet current --json`, `tx list --json`, and verified state dir/file modes
  `0700` / `0600`.
- Ran a real local transaction E2E: backend chat staged `tx-1` for a zero-value
  Base transfer, Anvil ran locally with chain id `8453`, and `aomi tx sign
--eoa --rpc-url http://127.0.0.1:18545 tx-1` submitted two local EOA hashes
  (`0x00b374…d3f7` fee call, `0x963f7d…e61d` staged self-send) and cleared the
  pending queue after backend notification.
- Rechecked skill freshness with
  `node ../skills/aomi-transact/scripts/verify-cli-surface.mjs --cli
packages/client/dist/cli.js --skip-live-apps` — passed. The full live-app
  check still intentionally reports the known local `/api/apps` registry drift
  (`alphascout`, `fanforge`, `geckoterminal`, etc.) versus the canonical
  32-app account registry confirmed by the auth smoke.
