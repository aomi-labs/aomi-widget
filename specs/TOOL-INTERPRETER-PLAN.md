# Tool Interpreter Plan

Source examples: `tmp-examples.md` (real trace rows + raw payloads).
Golden tests: `apps/shadcn-registry/src/components/assistant-ui/tool-interpreter.test.ts`.

## 1. Goal

Turn one backend tool result into one trace row:

```text
interpretToolStep({ toolName, argsText?, result }) -> { icon, title, chips, confidence, rawLabel }
```

`working-trace.tsx` stays dumb: it renders `title`, up to four `chips`, a `+N more`
pill, and the raw JSON in an expandable block. It never reads backend shapes.

Today `interpretToolStep` is one 600-line file: a fixed `??`-chain of shape
matchers, each of which both *recognizes* a payload and *hand-builds* its chips.
That works but every new tool means editing the chain, and chip choices are
copy-pasted per matcher. The refactor keeps the exact same output (the golden
tests must stay green) but splits recognition from presentation so the two can
grow independently.

## 2. The pipeline

```text
raw step
  -> unwrap      strip envelopes, parse argsText, surface errors
  -> parse       ordered family matchers -> ToolOperation { id, facts[] }
  -> present      operation id -> descriptor -> title + ordered chips + icon
  -> InterpretedToolStep
```

Three rules make it clean:

1. **Parsers emit facts, not chips.** A parser's job is "what happened + which
   values matter," expressed as typed `ToolFact`s. It never picks an icon, a
   label color, or a chip order.
2. **Presentation reads facts, not payloads.** The display layer turns facts
   into chips using one shared catalog. It never touches `result`.
3. **One ordered registry decides identity.** Matchers run in a fixed order,
   first match wins (same as today's `??`-chain, just data-driven). Order is the
   only thing that resolves ambiguity, so it is explicit and tested.

## 3. What the frontend actually sees

The trace does not get stable backend tool ids. It gets assistant-ui tool parts
built from backend `tool_result` entries:

- `toolName` — a model-written topic: `Check token balance`,
  `Stage Aerodrome USDC to AERO swap`, `Quote Aerodrome AERO to USDC`.
- `argsText` — usually absent for completed results.
- `result` — parsed JSON, or `{ args: rawText }` when the body was plain text.

So recognition is **shape-first, label-second**:

1. Prefer structured `result` fields.
2. Use EVM/SVM standards (selectors, tx shape) when the payload carries them.
3. Use the label only for fallback titles and one cosmetic token hint.
4. Anything unrecognized stays safe and fully visible in the expandable raw block.

## 4. Folder structure

Lean core now; reserve slots for backend families we have not seen yet. Do **not**
scaffold empty files for shapes the backend does not send — add a family file the
day a real payload needs it.

```text
apps/shadcn-registry/src/components/assistant-ui/tool-interpreter/
  index.ts            # public API: interpretToolStep, resolveToolIcon/Chips, types
  types.ts            # ToolStepInput, ToolFact, ToolOperation, InterpretedToolStep
  unwrap.ts           # envelope strip, argsText parse, error surfacing
  normalize.ts        # pure fact builders: chain, address, token, amount, status, calldata
  pipeline.ts         # ordered matcher registry + fallback

  families/
    simple.ts         # skills, web.search, evm.context, native balance, contract lookup, errors
    evm-call.ts       # tx.input present -> erc20 selector variants, else generic
    evm-tx.ts         # stage.*, simulate_batch, pending approval
    # reserved (add when a real payload appears): svm.ts, wallet.ts, protocols/*

  present/
    descriptors.ts    # operation id -> { title policy, icon, chip plan }
    chips.ts          # fact -> chip catalog (label + icon + dot per kind/role)
    fallback.ts       # label humanization + topic-keyword icon
```

Keep the import path stable so nothing else changes:

```text
@/components/assistant-ui/tool-interpreter
```

## 5. Core types

```ts
type ToolStepInput = { toolName: string; argsText?: string; result?: unknown };

type FactKind =
  | "chain" | "cluster" | "block" | "slot"
  | "token" | "address" | "amount" | "count"
  | "selector" | "decoded" | "status" | "gas" | "computeUnits"
  | "skill" | "sourceHost" | "error";

// role disambiguates same-kind facts: an address may be owner/from/to/spender/
// contract/recipient/payer/signer/program/null. role drives icon + order.
type FactRole =
  | "owner" | "from" | "to" | "spender" | "contract" | "recipient"
  | "payer" | "signer" | "program" | "null"
  | "primary" | "secondary";

type ToolFact = {
  kind: FactKind;
  role?: FactRole;
  value: string;          // already stringified; never a raw bigint/object
  label?: string;         // optional display override
  source: "result" | "decoded" | "args" | "label"; // provenance, for confidence
};

type ToolOperation = {
  id: string;             // "evm.call.erc20.allowance", "evm.tx.stage.swap", ...
  facts: ToolFact[];
  confidence: "high" | "medium" | "fallback";
  rawLabel: string;       // original toolName, for the descriptor title policy
};

type InterpretedToolStep = {
  icon: LucideIcon;
  title: string;
  chips: ToolChip[];      // { label, icon?, dot? }
  confidence: "high" | "medium" | "fallback";
  rawLabel: string;
};
```

`source` gives us confidence for free: all-`result`/`decoded` facts → `high`;
any `label`-derived identity → `medium`; nothing recognized → `fallback`.

## 6. Layers

### 6.1 Unwrap

Runs first, chooses nothing visual.

- Parse `argsText` JSON when present.
- Wrap non-JSON results as `{ args: rawText }` (matches today).
- Strip routed envelopes (`RoutedToolReturn`, `__aomi_tool_return`,
  `__aomi_tool_value`, `__aomi_tool_routes`) down to the inner value.
- Surface `is_error` / `{ error }` uniformly so the error family can match.
- Keep the original `result` untouched for the expandable raw block.

### 6.2 Normalize (pure fact builders)

Reusable, side-effect-free. Each returns `ToolFact | ToolFact[] | null`.

- `chain(chain_id?, chain_name?)` → resolves via `getChainInfo` /
  `SUPPORTED_CHAINS` from `@aomi-labs/react` (the canonical source — no private
  chain map). Emits a `chain` fact only when an explicit id/name exists.
- `address(value, role)` → validates `0x…40`, lowercases, tags role; flags the
  zero address as `role: "null"`.
- `token(symbol)` → `token` fact from an explicit `symbol` field.
- `amount(raw, decimals?)` → decimal-formats only when decimals are explicitly
  known; otherwise passes the raw integer string through.
- `status(value)` → normalizes to `queued | pending | success | failed | revoked`.
- `calldata(input)` → `selector` (first 4 bytes) + ABI-word slicing
  (`addressFromWord`, `bigintFromWord`). Pure hex math, no address lookups.

Normalizers never decide operation identity.

### 6.3 Parse (families)

A family matcher is `(ctx) => ToolOperation | null`. It checks payload shape,
picks an operation `id`, and calls normalizers to collect facts. Broad families
(`evm.call.*`, `evm.tx.*`) use a small inner variant table instead of if/else
ladders — e.g. `evm-call` selects the erc20 variant by selector, else
`evm.call.generic`.

### 6.4 Present (descriptors)

Each operation `id` maps to a descriptor:

```ts
type Descriptor = {
  title: "fixed" | "label";   // fixed canonical string, or humanized model label
  fixedTitle?: string;
  icon: LucideIcon | "selector" | "stagedAction"; // fixed, or derive from facts
  chipPlan: ChipSlot[];       // ordered list of (kind, role) slots to fill
};
```

The presenter walks `chipPlan`, pulls the matching fact, and renders it through
the chip catalog (§7.2). Missing facts are skipped — the plan is a *preference
order*, not a requirement. This is what kills the copy-paste: a new chip means
one catalog entry + one slot, not edits across every parser.

## 7. Display rules (the UI contract)

This section is the deterministic spec for how a row looks. It answers: when do
we show the chain, what order do chips go in, what icons, when `+N more`.

### 7.1 Title policy — fixed vs. label

Use a **fixed** canonical title when the operation is generic and the model label
adds nothing or is noisy. Use the **model label** (humanized) when it carries
specific intent the payload can't reconstruct.

| Policy | Operations | Why |
| --- | --- | --- |
| fixed | `skill.activate` → "Activate skill", `evm.context` → "Check network", `evm.contract.lookup.*` → "Resolve contract" / "Resolve token", `evm.call.erc20.*` → selector title, `evm.tx.simulate_batch` → "Simulate batch", `wallet.tx.pending_approval` → "Await wallet approval", `web.search` → "Search web" | label is redundant / varies pointlessly |
| label | `evm.account.native_balance`, `evm.call.generic`, `evm.tx.stage.*`, `tool.error` | label holds real intent (`Stage Aerodrome USDC to AERO swap`) the payload lacks |

### 7.2 Chip catalog — one place, keyed by (kind, role)

Every chip's label shape, icon, and dot live here and nowhere else.

| kind / role | label | icon | dot |
| --- | --- | --- | --- |
| chain | chain name (`Base`) | chain logo (`getChainIcon`) | — |
| block | `48,317,939` (grouped) | Blocks | — |
| token | symbol (`USDC`) | Coins | — |
| address · owner | `0xda65…3cf0` | User | — |
| address · from | `0xda65…3cf0` | ArrowUpRight | — |
| address · to / spender | `0xcf77…4e43` | ArrowDownLeft | — |
| address · other | `0x…` (shortened) | — | — |
| selector / metadata name | `decimals` | — | — |
| decoded value | raw string (`6`) | — | — |
| amount | decimal if decimals known, else raw int | — | — |
| count · tx | `2 txs` | Receipt | — |
| count · results | `3 results` | — | — |
| status · queued | `Queued` | — | `#854F0B` amber |
| status · pending | `Pending approval` | — | `#854F0B` amber |
| status · success | `Success` | — | `#3B6D11` green |
| status · failed/error | `Failed` | — | `#A32D2D` red |
| gas | `262,888 gas` | Fuel | — |
| sourceHost | `tradingview.com` | — | — |
| skill | humanized skill name | — | — |

Only three status colors exist, chosen from the normalized status kind — never
free-form. Address shortening is always `0x` + 4 + `…` + 4.

### 7.3 Chip order — fixed priority

Chips are laid out by a single global priority so any row reads left-to-right as
*context → subject → action → parties → magnitude → outcome*:

```text
1  chain / cluster        (network context, when present)
2  block / slot
3  token
4  selector / metadata name
5  address: owner/from     (the acting party)
6  address: to/spender/recipient
7  amount / decoded value
8  count (tx / results / steps)
9  gas / compute units
10 status                  (always last; carries the dot)
```

A descriptor's `chipPlan` is a subset of these slots in this order. This is why
`Check allowance` is `[chain, token, owner, spender]` and a staged swap is
`[chain, action, txId, status]` — both are just this order, filtered.

### 7.4 When do we show the chain?

A `chain` chip appears **iff** both hold:

1. the operation's `chipPlan` includes the chain slot, **and**
2. `normalize.chain` produced a fact from an explicit `chain_id` / `chain_name` /
   `network` field in the payload.

Never inferred from the label, never from an address. Consequences (all match the
current golden tests):

- **Show:** `evm.context`, `evm.contract.lookup.*`, `evm.call.erc20.*`,
  `evm.tx.stage.*`, `evm.tx.simulate_batch` — all carry an explicit chain field.
- **Don't show:** `evm.account.native_balance` — its payload (`address`,
  `balance_wei`, `nonce`) has **no** chain field, so no chip even though the
  label says "on Base". `web.search`, `skill.activate`, `tool.error`,
  `wallet.tx.pending_approval` — no chain in payload.
- **`evm.call.generic`:** chain field exists, but the plan is `[from, to]` only —
  for an unknown call the two addresses are the identifying info and we keep the
  row minimal. (Deliberate; locked by the Aerodrome golden tests.)

### 7.5 Icons

Deterministic, in this precedence:

1. **Operation descriptor icon** — fixed per operation (simulate → Flask,
   context → Globe, pending approval → Send). Preferred.
2. **Selector icon** for `evm.call.erc20.*` (from the ERC-20 selector registry).
3. **Staged-action icon** for `evm.tx.stage.*`, chosen from `kind` / decoded
   selector via the staged-action pattern table (approve → Pen, swap → Swap,
   bridge → Cable, burn → Flame, …).
4. **Chip icons** — fixed per (kind, role) from the catalog (§7.2).
5. **Fallback title icon** — topic-keyword table on the label, else `Wrench`.

Label-keyword icons (5) only ever run in the fallback path. They never decide
operation identity or a known operation's icon.

### 7.6 `+N more` and the four-chip cap

- `working-trace.tsx` renders at most `MAX_VISIBLE_CHIPS = 4`, then a `+N more`
  pill where `N = chips.length - 4`.
- **Chips are curated, not a field dump.** A descriptor's `chipPlan` is authored
  to yield ≤ 4 chips, so `+N more` should essentially never appear for a *known*
  operation. It is a safety valve for the fallback path, which may collect a few
  facts of unknown priority.
- `+N more` therefore means "more *curated* chips than fit," **not** "there is
  hidden raw data." The full payload is *always* available in the expandable JSON
  block regardless of chip count — so we never rely on `+N more` to signal
  "there's more to see." We do **not** try to show every param; we show the top
  4 by priority and let the raw block hold the rest.
- Ordering before truncation is the fixed priority (§7.3), so which 4 survive is
  deterministic.

## 8. Determinism & anti-overfit guarantees

**Deterministic.** `interpretToolStep` is pure: no clock, no randomness, no
network, no global mutable state. Same input → same output. Guarded by
fixture-based golden tests (`tmp-examples.md` rows). The matcher registry is
first-match-wins over a fixed order, so ambiguity resolves the same way every
time.

**No hardcoded onchain values.**

- No address / pool / router / token registries in the UI. The only address with
  special meaning is the standard **zero address** (→ `role: "null"`, burn/mint).
- The selector registry holds **only ERC-20 standard selectors** (`balanceOf`,
  `transfer`, `approve`, `allowance`, `decimals`, `symbol`, `name`,
  `totalSupply`) — stable across every ERC-20 token. Protocol selectors are
  never added; those calls fall to `evm.call.generic`.
- Chain id ↔ name comes from `@aomi-labs/react`, not a private map.
- Token symbols come from payload `symbol` fields. The label regex hint
  (`topicTokenChip`) is the **one** cosmetic label heuristic and only fills a
  token chip when the payload has none — it never sets identity or icon.

**No overfitting to the examples.**

- Matchers key on **shape** (which fields exist, which selector) — never on
  specific example strings, addresses, or protocol names.
- Aerodrome pool checks, quotes, and swaps in `tmp-examples.md` must stay
  `evm.call.generic` / `evm.tx.stage.swap` driven by structure — the golden
  tests include an adversarial "must not infer routes from addresses" case to
  lock this. Protocol-specific rendering is opt-in and only allowed when the
  **backend** sends structured protocol fields (a venue namespace, route/quote
  objects) — never reconstructed from calldata.

## 9. Family coverage

Covered by current examples (must render the same or better):

| Row | Operation id | Chip plan (after §7.3 order) |
| --- | --- | --- |
| Activate skill | `skill.activate` | activated skills |
| Check network | `evm.context` | chain, block |
| Check … balance (native) | `evm.account.native_balance` | owner, ETH amount |
| Resolve contract/token | `evm.contract.lookup.found` / `.missing` | chain, token |
| Check token balance | `evm.call.erc20.balance_of` | chain, token, owner |
| Read token decimals | `evm.call.erc20.decimals` | chain, token, `decimals`, value |
| Check allowance | `evm.call.erc20.allowance` | chain, token, owner, spender |
| Aerodrome pool / quote | `evm.call.generic` | from, to |
| Stage approve/swap/burn | `evm.tx.stage.*` | chain, action, txId, status |
| Simulate batch | `evm.tx.simulate_batch` | chain, tx count, status, gas |
| Await wallet approval | `wallet.tx.pending_approval` | tx count, status |
| Search web | `web.search` | token, result count, host |
| Error result | `tool.error` | status(failed), code |

Reserved for later (no example yet, add the family file when a real payload
lands): SVM context/account/portfolio/program, EVM/SVM tx commit & signature
lifecycle, wallet authorization, automation/thread spawn, external/plugin tools,
structured protocol swaps. Facts and chip catalog already cover their fields, so
adding them is a family file + a descriptor, nothing else.

## 10. Migration

1. **Freeze.** Keep the existing test file as golden; add fixtures from
   `tmp-examples.md` for every row in §9.
2. **Move.** Create `tool-interpreter/`, move public exports to `index.ts`, keep
   the import path. No behavior change.
3. **Types + pipeline.** Add `types.ts`, `unwrap.ts`, `normalize.ts`,
   `pipeline.ts`. `interpretToolStep` still returns the same shape.
4. **Migrate families** one group at a time, tests green after each: skills →
   search → evm.context → account → contract → erc20 call → generic call →
   tx.stage → simulate → pending approval → errors → fallback.
5. **Centralize presentation.** Add `descriptors.ts` + `chips.ts`; delete the
   per-matcher chip building. `working-trace.tsx` keeps the 4-chip cap.
6. **Reserved families.** Add SVM / wallet-lifecycle / protocol files only when a
   real backend payload requires them.

## 11. Success criteria

- `working-trace.tsx` stays layout-only; `interpretToolStep` stays the only
  UI-facing API with an unchanged return shape.
- A new tool family = one family file + one descriptor. A new chip field = one
  catalog entry + one slot — no edits across parsers.
- Protocol logic is isolated and only consumes structured backend fields.
- Every `tmp-examples.md` row renders identically to today (golden tests green).
- Unknown tools render safely, with full raw detail expandable.
