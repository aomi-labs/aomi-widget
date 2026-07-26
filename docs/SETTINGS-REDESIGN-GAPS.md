# Settings redesign — stub gaps to fill

Branch `worktree-settings-redesign`. The portal settings surface was reduced to
**General / Account / Usage** (+ a standalone `/statement` page), styled to the
aomi design system (sky accent, pink decorative meters, flat/no shadows, PT
Serif display). Where the backend surface didn't exist yet, the UI renders
from clearly-marked fixtures. This is the fill-up list.

## Account tab (`src/features/account/`)

| Gap | Today | Real binding |
|---|---|---|
| Wallet rows | `fixtures.ts` (`seedWalletPolicies`) | `GET /api/account/wallets` → `{address, chain_type, signing_mode}`; merge identities from `GET /api/account` for provenance (`linkedVia`) and `is_primary` |
| Delegated grants panel | `fixtures.ts` (`seedGrants`) | **No endpoint.** Needs a listing over backend `delegated_approval` (provider, scope, expiry, revoked) + revoke action |
| Mode change (the ACL) | local state; "Sign to authorize" is simulated | Permit ceremony: `POST /api/account/authorization/challenge` → wallet signs → `POST /api/account/authorization/commit` (client helpers exist in `@aomi-labs/client` `authorization.ts`; CAS on `authorization_version`) |
| Activate (read-only → signable) | local state | SIWE/SIWS bind. The old SVM bind card (`features/general/svm-wallet-binding.tsx` + hook) is kept in-tree but unreferenced — re-home it as this action |
| Wallet brand tags (MetaMask/Phantom) | fixture `rdns` | Capture EIP-6963 `rdns` / wallet-adapter id at connect, persist to wallet `displayMetadata`, return via account API |

## Usage tab + `/statement` (`src/features/usage/`)

| Gap | Today | Real binding |
|---|---|---|
| Per-app matrix + summary | `fixture.ts` (mira.eth, 3 months) | Partial: `GET /api/account/usage` already returns per-app credits/tokens. Missing: the three-subject split (model / tool use / outcome), base-vs-charged (+10% managed markup), per-model rows |
| Monthly history (month dropdown) | fixture months | Needs period parameter / statement history endpoint |
| Payment strip (allowance vs x402 overage) | fixture | Needs allowance + x402 settlement fields (`allowanceApplied`, `x402Settled`) on the statement |
| Section B fee legs (flow, bps, feeToken, tx) | fixture | Needs `user_transactions` outcome-fee legs on the statement endpoint |
| `/statement` identity header | fixture (`mira.eth`) | Wire to `/api/account`; decide gating (page is public today but renders only fixture data) |

## General tab (`src/features/general/`)

- **Default network** row is display-only (shows connected chain ticker); no setter is wired.
- **Disconnect** uses `adapter.disconnect` when the wallet kit exposes it, else falls back to `openAccountUI` labeled "Manage wallet".
- Theme row writes `useSettings().colorMode` (`dark`/`light`/`auto` = Dark/Light/System) — fully wired.

## Removed with the redesign

Deploy, App Keys, Bots, Secrets, BYOK tabs; `features/{apps,app-keys,bots,secrets,byok}`, `components/settings/deploy-settings.tsx`, `lib/usage-range*` deleted. Deployments continue to live at `/deployments` (GitHub-return params on `/settings` still forward there). If any retired tab must survive, it needs a new home — the redesign intentionally does not carry them.

## Test coverage

`settings-route-callers.test.tsx` now covers only GeneralSettings (`/api/account`). Add route-caller tests for Account (`/api/account/wallets`, authorization challenge/commit) and Usage once they bind to real routes.

## Round 2 — chat-shell adoption (popup settings, packages, theme, sidebar)

- **Settings is now a popup** (`components/settings/settings-modal.tsx`) opened
  from the chat header. The full-page shell (`settings-layout.tsx`,
  `settings-sidebar.tsx`, `settings-runtime-provider.tsx`) is deleted;
  `/settings` is a redirect stub that forwards GitHub-App query params to
  `/deployments` and everything else to `/`.
- **Packages modal** (`components/shell/packages-modal.tsx`) is the design
  catalog with a hardcoded package list and local install state. Real bindings:
  app catalog from `/api/thread/apps` / admin app-store, per-account install
  state, icons via app metadata.
- **Theme switch** in the header toggles `useSettings.colorMode` light/dark;
  "System" remains selectable from Settings → General.
- **Sidebar** restyle lives in `apps/shadcn-registry` (thread-list +
  threadlist-sidebar) and uses the portal-defined `--aomi-*` tokens. Other
  widget-lib consumers (landing, embedded widget) don't define those tokens
  yet — promote them into `@aomi-labs/widget-lib` theme CSS before shipping
  beyond the portal.

## Round 4 — conversation surface + widget-lib token promotion

- The `aomi-*` tokens now live in the **shared widget theme**
  (`apps/shadcn-registry/src/themes/default.css`), so landing and embedded
  consumers resolve them too — the round-2 caveat is closed. The portal's
  `globals.css` keeps only its `--font-display` mapping.
- Conversation surfaces restyled to the mock inside the registry (thread
  empty state + hero composer + chips, user bubble, assistant AomiMark rows,
  working-trace card, dock composer). All streaming/animation behavior kept.
- Frame header is the mock's (border-b, thread title, right cluster); the
  real `NetworkSelect` renders as the header pill from portal
  `HeaderControls` (`hideNetwork` set on the composer control bar); the
  sidebar footer wallet bar is the mock account chip. Credits in the chip
  (mock shows "1,240 credits") still need an account-overview feed into the
  widget — today the second line is wallet network detail.
- Remaining conversation gaps vs the mock: tx-preview card (the mock's
  "Swap preview" card is a working-trace/tool-interpreter presenter concern,
  not yet restyled as a standalone card) and the mock's one-line dock
  composer Plus button (attachments) which we deliberately did not fake.

## Round 3 — token sweep + rebuild

The redesign surfaces are now built exclusively on the `aomi-*` design-token
namespace (full semantic set in portal `globals.css`, mirroring
~/Code/aomi-design tokens: bg/surface/surface-2/raised/border/fg/muted,
accent(+strong/subtle/on), hover, pink, success/warning/danger/info; light +
dark). Mock components port 1:1 (`bg-surface` → `bg-aomi-surface` …) with no
shadcn-vocabulary mixing. `SignerMode` resynced to the mock's current values
(`manual` / `client_auto` / `auto` / `denied`). The modal panel geometry is
inline-styled (immune to Tailwind arbitrary-class scanning misses).


## 2026-07-26 — design-system gaps closed

All five gaps from the component inventory are resolved; see specs/STATE.md
for the full rule set.

1. Focus ring — `--aomi-ring` + a zero-specificity `:focus-visible` rule in
   the widget theme.
2. Accent gradient — gone; "Sign to authorize" is the flat blue solid.
3. Alpha tints — `accent-tint` / `accent-outline` / `overlay-border` tokens;
   no raw opacity utilities left in the redesigned surfaces.
4. Selection grammar — split by size (pill = solid accent, card/row =
   accent-subtle + accent icon).
5. shadcn seam — tokens live in @aomi-labs/widget-lib; session panel, thread
   list, composer and the wallet-sheet shell all speak `aomi-*`.

REMAINING: the wallet picker's interior rows (wallet-picker.tsx, ~2.3k lines)
are still shadcn vocabulary — `bg-card`, `border-border/70`, `hover:bg-accent/40`,
`border-destructive/30`. Only its shell was refitted to the modal standard.
That file is the next sweep.
