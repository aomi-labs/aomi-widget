# Unified transaction review studies

Development-only route: `/dev/transaction-layouts`. Linked from `/dev/activity-final`.
No wallet connection, runtime actions, RPC calls, or production chat changes.

## Directions

1. **Batch focus**: one transaction list and a shared net wallet-change panel;
   collapsed history above the active batch.
2. **Effects per transaction**: effects shown under their originating transaction;
   signing still applies to the whole batch, with history below.
3. **Compact review**: lean transaction rows and expandable shared wallet changes;
   collapsed history above.

Seven scenarios: one transaction without history, two without history, two with
history, four with long names and intermediate token movements, failed simulation,
two separately signed network batches, and an undecoded contract call.
Shared net effects cancel intermediate token movements using illustrative data.
No inferred allowance amount is shown. The per-transaction permission note is fixture data.

The single Transactions section contains current preparation progress, simulated
effects, network, gas and wallet metadata, and Reject / Send to wallet. It can
collapse entirely. Past batches expand independently and stop animating; rejected
batches show a red signing segment. Local mock signing archives the current batch
and advances any queued batch. Signed refers to the wallet result, not chain confirmation.

Laptop, short-window, and phone presets constrain the preview. The review body
scrolls independently; actions stay visible. Phone has Chat / Transactions tabs.
Existing theme tokens, icons and semantic transaction glyphs are reused. Motion
respects reduced-motion preferences. Transaction cards have no hover effect.

## Verification

Portal TypeScript and scoped ESLint passed (existing nonfatal pages-directory lint
warning). Headless Chrome checked all 63 direction/scenario/screen combinations
for horizontal overflow and footer containment, with no page errors. Exercised
signing, rejecting, moving to history, sequential network batches, and failed-
simulation signing guard. Desktop, compact, per-transaction, and phone views were
rendered for visual inspection.

## Revised unified shell

All directions now share one outer card for skills, optional subagents (the
four-transaction example), and transactions. Soft cards replaces the old
per-transaction effects experiment. Chain identity stays on every transaction.
Repeated batch headings are removed. A separated bottom Preview appears only
after commit when signing is available; it contains net effects, gas/wallet
metadata and actions. Staged, simulated and failed states show no preview,
placeholder or buttons. Failed simulation colors the progress strip only.
The transaction list scrolls above the review; long effect lists have a bounded
scroll area. Short-window skills start collapsed to preserve transaction space.

## Content sizing refinement

The outer card uses content height with Motion layout animation (disabled for
reduced motion). The transaction viewport holds two 82px cards with an 8px gap;
compact rows use 68px. Additional transactions scroll. The available screen
height can further constrain the surrounding body. Signing always forces the
section open and replaces its disclosure button with a static heading. Without
signing, it starts open and can collapse. The preview is an inset surface inside
Transactions, without the full-width footer divider or balance-row rules.

Browser verification measured 323px before signing and 139px when collapsed,
then confirmed switching to committed reveals the review even from collapsed.
Four transaction rows have 352px scroll content in a 172px viewport. Phone
actions remain inside the preview. Portal typecheck and scoped lint passed.
