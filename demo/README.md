# Demo studio

Records repeatable product demo videos against a forked mainnet, so demos stop
being an afternoon of retakes and start being a build artifact.

Design and scenario catalog: [`specs/DEMO-STUDIO.md`](../specs/DEMO-STUDIO.md),
[`specs/DEMO-SCENARIOS.md`](../specs/DEMO-SCENARIOS.md).

**Status: proven.** Takes 13/14 (2026-07-31) recorded DS2 end-to-end — agent
staked 5 ETH into Lido on a mainnet fork, verified on-chain (5.0 stETH), real
tx hash on screen, `execution_kind: e2e_real_fork_call`.

## How it fits together

| Layer | Where | Status |
| --- | --- | --- |
| Fork lifecycle + pre-funding | `aomi-cli test-env evm` in **product-mono** | exists, we only call it |
| Backend, catalog-scoped | product-mono backend + `LOCAL_SCOPED_APPS` (uncommitted patch) | proven |
| Chain routing in the UI | `NEXT_PUBLIC_USE_FULL_TESTNET` + widget-lib helpers | wired into the portal |
| E2E wallet + fork executor | `apps/portal/src/server/e2e-wallet.ts` | proven |
| Scenarios | `demo/scenarios/*.scenario.ts` | DS2 done, 5 more drafted for review |
| Capture | `demo/capture/record.ts` | proven |

The UI keeps the **real** chain ids and only swaps the RPC url, so a recording
shows "Ethereum · Mainnet" while every transaction lands on a local fork.

## Runbook — verified 2026-07-31

Every step below was exercised on real takes. Paths assume `~/Code/product-mono`
and this repo side by side.

### 0. One-time prerequisites

- Build the CLI and backend from product-mono source (the homebrew `aomi` has
  **no** `test-env` command group):

  ```bash
  cd ~/Code/product-mono/aomi && cargo build -j2 --bin aomi-cli --bin backend
  ```

- `service.toml` must exist in the backend's cwd (`aomi/`), and it must trust
  the kid the portal actually signs with. A locally-run portal mints bearers
  with kid **`aomi-bff-dev-1`**; the checked-in staging trust records only list
  `aomi-bff-staging-1` (same keypair, different label — verification fails on
  the kid lookup). Fix once: duplicate the `[[trusted_issuers]] name="aomi-bff"`
  block in the gitignored `service.toml` with `kid = "aomi-bff-dev-1"`.

- The demo wallet is **anvil dev account 2** (`0x3C44…93BC`) — account 0 is
  permanently bound to another user in the shared DB. Account 2 must be bound
  to the demo account with `client_auto` signing (already done for
  `AOMI_E2E_CANONICAL_USER_ID=8641fa7c-…`; redo only for a new account):
  challenge → `cast wallet sign --data <typed_data>` → commit, once with
  `mode=bind`, once with `mode=client_auto`, against
  `/api/account/authorization/{challenge,commit}`.

### 1. Fork up

```bash
cd ~/Code/product-mono
FULL_TESTNETS=true PROVIDERS_TOML=~/Code/product-mono/providers.toml \
  ./aomi/target/debug/aomi-cli test-env evm up --chains 1
```

`PROVIDERS_TOML` is required — discovery walks the *cwd's* ancestors, so it
fails from this repo. **The port is random on every `up`** — read it:

```bash
python3 -c "import json;print(json.load(open('$HOME/.aomi/test-env/pids.json'))['proxies'][0]['port'])"
```

Proxies die easily (tool-call process-group cleanup, other sessions running
`kill-all.sh`). If takes start failing `assertForkedOrDie`, re-up and re-read
the port.

### 2. Backend, scoped

```bash
cd ~/Code/product-mono/aomi
LOCAL_SCOPED_APPS="demo-studio-none" \
OFFICIAL_GITHUB_TOKEN="$(gh auth token)" \
FULL_TESTNETS=true \
PROVIDERS_TOML=$HOME/.aomi/test-env/providers.toml \
  ./target/debug/backend
```

- `PROVIDERS_TOML` now points at the **derived** file test-env wrote — that is
  what routes the backend's chain reads/writes to the fork.
- `LOCAL_SCOPED_APPS` = union of `scenario.apps`; `demo-studio-none` is the sentinel
  for skills-only scenarios (scope only activates when non-empty). Scoped run:
  boot log is ~1 line instead of ~17k fetch errors, and the host never writes
  the shared `applications` table.
- Needs `SUPABASE_DB_URL` (or `DATABASE_URL`) in the environment — the backend
  refuses to boot without one.

### 3. Portal env

`apps/portal/.env.local` needs, on top of a normal local config:

```bash
NEXT_PUBLIC_BACKEND_URL="http://127.0.0.1:8080"     # hosted backends can NEVER see the fork
BACKEND_URL="http://127.0.0.1:8080"
NEXT_PUBLIC_USE_FULL_TESTNET="true"
NEXT_PUBLIC_FULL_TESTNET_RPC_MAP='{"1":"http://127.0.0.1:<FORK_PORT>"}'
AOMI_ENABLE_E2E_WALLET="true"
AOMI_E2E_WALLET_TOKEN="demo-studio-local"
AOMI_E2E_EXECUTION_MODE="real"
NEXT_PUBLIC_AOMI_E2E_EXECUTION_MODE="real"          # client checks THIS one
AOMI_E2E_SIGNER_PRIVATE_KEY="<anvil account 2 key>"
AOMI_E2E_RPC_URL_1="http://127.0.0.1:<FORK_PORT>"
AOMI_E2E_CANONICAL_USER_ID="<users.id to bill/attribute the session to>"
AOMI_E2E_MAX_NATIVE_WEI="6000000000000000000"       # 6 ETH cap for a 5 ETH stake
# VERCEL_ENV must be UNSET — isE2EWalletEnabled() refuses otherwise.
```

Gotchas, each of which cost a take:

- **Update both `<FORK_PORT>` occurrences on every fork re-up** — and never
  regex-replace all `127.0.0.1:\d+` in the file, that clobbers the backend URL.
- **Turbopack caches inlined `NEXT_PUBLIC_*` values across restarts.** After
  changing one: `rm -rf apps/portal/.next-demo-studio`, then restart the portal.

Start the portal (`.claude/launch.json` has `portal-demo-studio`, port 3500,
isolated dist dir).

### 4. Record

```bash
PORTAL_URL=http://localhost:3500 \
AOMI_E2E_WALLET_TOKEN=demo-studio-local \
AOMI_E2E_ADDRESS=0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC \
AOMI_BIN=$HOME/Code/product-mono/aomi/target/debug/aomi-cli \
PROVIDERS_TOML=$HOME/Code/product-mono/providers.toml \
FULL_TESTNETS=true \
  pnpm exec tsx demo/capture/record.ts ds2-stake-eth
```

What a run does, in order: reads the fork from `pids.json` →
`assertForkedOrDie` (anvil probe; refuses real RPCs) → `test-env evm reset`
per scenario chain (identical state every take) → funds `AOMI_E2E_ADDRESS`
with 10 ETH **after** the reset (reset reforks and wipes balances) → seeds the
E2E wallet cookie → dismisses the consent banner (repeatably — it mounts
lazily) → types each `prompts[]` entry at human cadence, verifying the typed
text (hydration eats first keystrokes) → waits on the streaming indicator, only
ever on real UI state → settle-waits for follow-up turns (execution callbacks
trigger one more agent turn; without this the video cuts mid-confirmation) →
if `expectsExecution`, polls up to 30s for the fork to mine a block and FAILS
the take if it didn't.

Output: `demo/out/<scenario-id>/` — master `.webm` + `markers.json`. Convert:

```bash
ffmpeg -i demo/out/ds2-stake-eth/*.webm -c:v libx264 -crf 20 -pix_fmt yuv420p \
  -movflags +faststart demo/out/ds2-stake-eth/ds2-stake-eth-master.mp4
```

Short cuts are derived from the markers — **do not re-shoot per format.**

### 5. Teardown

```bash
FULL_TESTNETS=true ./aomi/target/debug/aomi-cli test-env evm down
pkill -f "target/debug/backend"
```

## The safety rails, and why they are there

Full-testnet routing **fails open**: with the env missing, the portal silently
uses real mainnet RPCs and a money-spending take would look successful. The
independent guards, none of which should be downgraded:

1. `assertForkedOrDie()` — `anvil_nodeInfo` probe on every endpoint before
   recording; only anvil answers it.
2. `forkProgress()` — block height before/after; an `expectsExecution` take
   fails if the chain didn't move. (Replaced an earlier browser-traffic watch,
   which was wrong: agent tools execute server-side, the page never contacts
   the fork.)
3. Server-side, `e2e-wallet.ts` allows contract calls **only when the RPC
   answers `anvil_nodeInfo`** (fails closed); on real RPCs the executor stays
   self-transfer-only with a dust cap. Covered by tests in
   `e2e-wallet.test.ts`.

## Known gaps / caveats

- The recorder stubs `POST /api/exec/simulate` (FE bug: the browser sends an
  empty body; fee injection 400s and the wallet request dies). Remove the
  WORKAROUND block in `record.ts` once the client fix lands.
- Takes create **real threads** on the canonical user's account in the shared
  DB — archive them before partner-facing takes; the sidebar is on camera.
- Raw `wallet:tx_complete` JSON renders as a chat bubble, and the agent's
  "please approve" can land *after* auto-execution confirms — both are product
  UI polish items on the demo path.
- Solana: `test-env svm` (Surfpool mirror) exists but is unverified against
  Jupiter/Marinade; byreal's off-chain orderbook can't be forked at all.
- `aomi tx sign` prints the **fee** transfer hash, not the protocol tx hash —
  never present it as the swap.
