# Portal Visual Theme

Branch: `feat/chat-portal-visual-theme` (forked from `feat/chat-portal-settings-revamp`).

Portal visual language: monospace-heavy **terminal / dev-tool** dark UI — deep
charcoal near-black, hairline borders, ALL CAPS tracked micro-labels, tabular
numbers, and a single restrained accent. Keep Aomi product identity (logo,
Connect wallet, real suggestion prompts) — match the *feel*, not reference
brand/content.

## Always-start localhost (this work)

Must be on **`feat/chat-portal-visual-theme`** to see this visual experiment.

From repo root:

```bash
pnpm --filter portal exec next dev -p 3000
```

Or from `apps/portal`:

```bash
pnpm exec next dev -p 3000
```

Then open [http://localhost:3000](http://localhost:3000).

## Direction (mono-first terminal)

| Token | Choice |
| --- | --- |
| Primary UI font | **Geist Mono** — chrome, labels, empty state, settings labels, rail, numerics |
| Secondary font | **Geist Sans** — only when needed for long prose (`font-sans` / `.aomi-prose`) |
| Background | Deeper charcoal near-black (`oklch(~0.09)`) |
| Borders | Hairline (`oklch(1 0 0 / 8%)`) |
| Secondary text | Muted mid-gray |
| Accent | Single restrained status green (`--portal-accent` → `--portal-status-success`); no rainbow |

## Chat empty-state match

Restyle the **real** Aomi empty chat toward denser ops chrome — without
pasting fake product data onto a chat surface:

| Surface | Approach |
| --- | --- |
| Welcome | Sentence-case title + muted secondary line. **No** fake `WORKSPACE` eyebrow |
| Suggestion cards | Hairline bordered prompts, muted meta line, tabular mono on amounts (`1`, `100`). **No** rainbow left status bars, **no** `SUGGESTIONS` section stamp |
| Composer | Denser charcoal surface, hairline border, sharper radius, tighter control row |
| Thread rail | Tighter rows, hairline separator, muted New Chat. **No** fake `THREADS` rail label |
| Portal frame | Header/side chrome denser charcoal; portal CSS overrides |

**Do not** invent Billing/fake ops metrics, fake section stamps
(`Workspace` / `Suggestions` / `Threads`), or decorative status accent bars on
prompt cards. Aomi’s layout stays thread-rail + chat + composer; density and
surface language carry the ops *feel*.

### Shared package

Editing `apps/shadcn-registry` empty-state / rail chrome **requires** a
`@aomi-labs/widget-lib` patch bump (AGENTS.md). Portal keeps additional
token/font overrides in `apps/portal` only — this mono-first pass is
**portal-scoped** (no widget-lib bump).

## Case rules

| Surface | Case | Example |
| --- | --- | --- |
| Titles, nav items, settings rows | Sentence or Title case | `Account Settings`, `Credits this month` |
| Micro-labels (real section heads only: settings rails, column heads, IDs, tab chips) | ALL CAPS + wide tracking | `FROM`, `ASSETS`, `AVAILABLE` |
| Units / secondary copy | Lowercase or sentence | `credits`, `tokens`, descriptions |

Use `.aomi-eyebrow` only for **true** micro-labels on structured surfaces
(settings, tables, deploy chrome). Do **not** stamp eyebrows onto chat empty
state or the thread rail just to look “ops.” Do not uppercase full sentences
or primary row labels.

## Typography

Shipping fonts (always loaded via `next/font/google` in
`apps/portal/src/app/layout.tsx`):

- **Mono (primary UI):** Geist Mono — `--font-geist-mono` on `body` /
  `font-mono`. Stack:
  `var(--font-geist-mono), "Geist Mono", ui-monospace, …`
- **Sans (secondary / long prose):** Geist Sans — `--font-geist-sans`; use
  `font-sans` or `.aomi-prose` when mono hurts readability
- Numerics: tabular via body `font-variant-numeric` + `.aomi-numeric`
- Eyebrow: ~10.5px, `letter-spacing: 0.09em`, muted foreground, mono

### Optional ABC Diatype (licensed drop-in only)

Diatype is **not** the shipping default. When licensed files are dropped under
`apps/portal/public/assets/fonts/diatype/`:

1. Uncomment the `@font-face` block in `apps/portal/src/app/globals.css`
2. Decide whether Diatype replaces Sans secondary or Mono primary
3. Optionally wire `next/font/local` in `layout.tsx`

| Step | Where | Shipping status |
| --- | --- | --- |
| Mono (primary UI) | Geist Mono via `next/font/google` (`--font-geist-mono`) | Active |
| Sans (secondary) | Geist via `next/font/google` (`--font-geist-sans`) | Active |
| `@font-face` Diatype | Commented block in `globals.css` | Optional later |

**Scope:** portal CSS / layout only. Do **not** put Diatype into
`apps/shadcn-registry` default theme / widget-lib (that would force all
consumers).

### Font files status (2026-07-17)

**ABC Diatype binaries were not found** on this machine or in the repo.
Existing portal fonts under `public/assets/fonts/` remain Bauhaus Chez
Display + iA Writer Mono only. Drop licensed files here:

```
apps/portal/public/assets/fonts/diatype/
```

See `apps/portal/public/assets/fonts/diatype/README.md`. Do not vendor
commercial font binaries without a license. Until then, Geist Mono (primary)
+ Geist Sans (secondary) are the active portal fonts.

## Surface

- Hairline borders (`border-border` / `oklch(1 0 0 / 8%)` in dark)
- Restrained fills; `--portal-accent` (status green) only for **real**
  status / sparse emphasis — not decorative bars on suggestion cards
- Deep charcoal chrome in dark mode; cool zinc in light mode (inherited tokens)
- Avoid purple glow, inset highlight tricks, and invented density chrome that
  does not map to Aomi product structure

## Icons

- Lucide only (`lucide-react`)
- Default size `size-3.5` / `size-4`, muted unless active
- Chat header chrome: `size-8` hit targets, consistent gap

## Utility classes (portal `globals.css`)

- `.aomi-eyebrow` — uppercase micro-label (mono)
- `.aomi-numeric` — Geist Mono + tabular nums
- `.aomi-prose` / `font-sans` — Geist Sans secondary for long prose
- `.aomi-card` — hairline bordered surface card

## Out of scope

- Cloning reference brand names, Billing panels, or fake ops metrics
- Aomi Build / Telegram visual forks beyond shared widget consumers of bumped package
- Pirating or committing unlicensed commercial font binaries
- Merging this branch into `main` / prod without explicit review of the mono experiment
