# Activity and transaction review studies

Development gallery: `/dev/activity-lab` in the `portal-ui-local` frontend.
The route returns notFound in production. This is a design prototype, not a
replacement for the shipping chat, wallet approval surface, or backend.

## Comparison

Eight presets compose four treatments for each part. All can be mixed via the
Trace, Activity, and Simulation selectors; Copy picks copies their names and
numbers. Focus preview hides the gallery controls while retaining a direction
selector. The mock theme toggle is local to this page.

| Direction             | Trace           | Activity           | Review              |
| --------------------- | --------------- | ------------------ | ------------------- |
| 01 Quiet continuity   | Open timeline   | Grouped card       | Balance first       |
| 02 Soft compartments  | Chapter cards   | Separate cards     | Transaction receipt |
| 03 Compact ledger     | Compact ledger  | Transaction ledger | Ordered steps       |
| 04 Conversation first | Minimal summary | Compact activity   | Review checklist    |
| 05 Guided execution   | Chapter cards   | Transaction ledger | Ordered steps       |
| 06 Airy workspace     | Open timeline   | Separate cards     | Balance first       |
| 07 Focused review     | Compact ledger  | Grouped card       | Transaction receipt |
| 08 Progressive detail | Minimal summary | Separate cards     | Review checklist    |

## Behavior represented

- Show subagents and invoked skills only when present; omit the entire activity
  rail when the turn has neither those nor transactions.
- Transactions appear as staged, before simulation. Each shows an action icon,
  human-readable name, chain identity, amount or allowance scope, and status.
- Clicking a transaction opens the review card below activity. Closing it leaves
  activity intact. Review transactions reopens it; nested details and agent
  summaries can be expanded independently.
- Replay staging animates staged → simulating → simulated, then pauses for review.
  Mock approval advances to awaiting wallet. Explicit mock signing advances to
  committed/submitted; a separate mock receipt action advances to confirmed.
- Simulation failures and expired quotes offer refresh instead of approval.
  Rejected wallet requests can be retried. Partial completion preserves the
  confirmed allowance approval and retries only the remaining swap.
- Balance changes, minimum received, estimated network fee, slippage, allowance,
  wallet, chain ID, target, simulation block, execution order, and mock hash are
  progressively disclosed. Long transaction names truncate in the list and are
  available via their title and wrapped full-name detail. Addresses wrap.
- 220–240 ms entry/disclosure animations, hover feedback, and live status updates
  have a prefers-reduced-motion override. At narrow widths the activity and
  review cards stack after the conversation rather than squeezing the chat.

## Grounding and integration boundary

Style references: Portal `settings-styles.ts`, Library lab, the semantic
`--aomi-*` theme tokens, canonical Aomi logo, and existing chain/skill registries.
The attached Codex screenshots supplied the stacked-panel interaction reference.

Workflow references read: `packages/client/src/types.ts` (simulation response),
client generated Agent contract and SDK staged/simulated build types, existing
`working-agent.tsx`, and the paired backend's
`aomi/crates/pipeline/src/pipeline.rs` (pending insert/update and action requests).

The future implementation must join canonical transaction/task identities rather
than deriving completion from trace text, preserve status after hydration, and
use the existing wallet execution authority. Estimates and readable token changes
must be conditional on available decoded data. Committed is not a receipt.
The prototype's fixed values, timer, and mock wallet buttons are solely fixtures;
no wallet, quote provider, transaction submission, or backend write is called by
the prototype. Existing Portal layout providers still wrap this development page.

## Verification

- Portal TypeScript and scoped Portal ESLint pass; source formatted with Prettier.
- Existing running Portal compiled and served the new route.
- Browser checks: all eight directions render review and approval; mock approve,
  sign, committed, and confirmed states; partial recovery retains the confirmed
  approval and asks for one transaction; conditional sections; desktop and dark
  theme screenshots; 390px long-label scenario has no horizontal overflow.
- Full production builds and backend tests are not required for this isolated
  development-only mock route. No publishable package source changed.

## Selected final mock — latest refinement

Open `/dev/activity-final`: open timeline and grouped activity. All transaction
rows share the same grey background, border, and 10px separation. Each row has
an icon/name/chain line followed by Stage, Simulate, Commit bars without state
checkmarks or a redundant ready-for-approval caption.

The review follows the existing `runtime-tx-handler.tsx` Wallet impact structure:
compact header, optional decoded balance rows, individual transaction disclosures,
wallet metadata, gas estimate when available, and Reject to the left of Send to
wallet. No success banner, exact allowance, slippage, minimum received, or invented
USD estimate is needed. Typography uses the existing Geist and Aomi semantic
tokens, with 12–14px hierarchy instead of a large swap hero.

The Review data selector exercises decoded balances, unavailable decoded data,
signature requests, partial decoding warnings, and failed simulation. A failed
simulation disables sending. Unknown effects are explicitly unavailable rather
than treated as zero. Transaction details are generic destination, network,
native value, call data, and gas; this is still fixture data, not a live decoder.
Reject immediately dismisses the request. There is no feedback form.

Commit prepares the wallet request; the review remains absent until that request
is ready. Accepting hands off to the mock wallet; transaction signing submits;
a separate receipt confirms. Signature-only requests sign without broadcast.
The original eight-direction gallery remains available separately.

Verified Portal TypeScript, scoped ESLint, mock rejection and wallet handoff,
pre-commit gating, failed-simulation disabled action, all five review data modes,
and 390px long-label geometry. Both transaction rows measure 88px at 390px, have
identical surface/border colors, and contain no progress icons. The document has
no horizontal overflow and Reject is positioned left of Send to wallet.

Latest visual pass: transaction cards have no hover or active surface transition.
Balance rows use the same generic Coins and native ETH glyph/direction markers
as runtime-tx-handler. A Native ETH + ERC-20 review-data fixture exposes both.
Transaction disclosures use action icons, a two-line title limit, a separate
sequence/destination subtitle, and aligned metadata columns. Full titles remain
available in expanded details. Estimated gas now has the Fuel icon and sits
next to signing-wallet metadata above the action-only footer. Browser computed
styles verify hovered and non-hovered card colors/borders remain identical.

Action identity is now shared between upper transaction cards and review rows:
ShieldCheck for approval, ArrowLeftRight for swap (matching the open trace),
Layers3 for generic interactions, and FileSignature for signatures. Wallet impact
and signing-wallet metadata use Wallet; Base uses the same chain mark throughout.
Outgoing token amounts use the danger color, incoming amounts use success.
The action area has an inset divider, white surface, and two full-width rounded
actions: secondary Reject on the left, ink Send to wallet on the right, matching the message-send action.

The grey Balance changes panel uses the same 1px semantic border and 14px
corner radius as the Transactions panel.
