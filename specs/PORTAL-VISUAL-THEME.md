# Portal Visual Theme

Branch: `feat/chat-portal-visual-theme` (forked from `feat/chat-portal-settings-revamp`).

Portal visual language inspired by NeuralForge (dev-tool chrome) and fintech
swap-modal density. Keep Aomi product identity (logo, Connect wallet, real
suggestion prompts) — match the *feel*, not NeuralForge brand/content.

## Chat empty-state match (this pass)

Restyle the **real** Aomi empty chat toward NeuralForge density — without
pasting fake ops chrome onto a chat product:

| Surface | Approach |
| --- | --- |
| Welcome | Sentence-case title + muted secondary line. **No** fake `WORKSPACE` eyebrow |
| Suggestion cards | Hairline bordered prompts, muted meta line, tabular mono on amounts (`1`, `100`). **No** rainbow left status bars, **no** `SUGGESTIONS` section stamp |
| Composer | Denser charcoal surface, hairline border, sharper radius, tighter control row |
| Thread rail | Tighter rows, hairline separator, muted New Chat. **No** fake `THREADS` rail label |
| Portal frame | Header/side chrome denser charcoal; portal CSS overrides + shared widget class tweaks |

**Do not** invent Billing/NeuralForge fake product data, fake section stamps
(`Workspace` / `Suggestions` / `Threads`), or decorative status accent bars on
prompt cards. Aomi’s layout stays thread-rail + chat + composer; density and
surface language carry the ops *feel*.

### Shared package

Editing `apps/shadcn-registry` empty-state / rail chrome **requires** a
`@aomi-labs/widget-lib` patch bump (AGENTS.md). Portal keeps additional
token/font overrides in `apps/portal` only.

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

- **Sans (UI / body / titles):** Geist Sans — `--font-geist-sans` on
  `body` / `font-sans`. Stack:
  `var(--font-geist-sans), "Geist", system-ui, sans-serif`
- **Mono (code / numerics):** Geist Mono — `--font-geist-mono`; amounts,
  credits, tokens, IDs, commits via `.aomi-numeric`
- Hierarchy: bold titles → medium row labels → muted metadata
- Eyebrow: ~10.5px, `letter-spacing: 0.09em`, muted foreground

### Optional ABC Diatype (licensed drop-in only)

Diatype is **not** the shipping default. Do not put unloaded commercial
family names first in the CSS stack — that makes the UI wait on a missing
font. When licensed files are dropped under
`apps/portal/public/assets/fonts/diatype/`:

1. Uncomment the `@font-face` block in `apps/portal/src/app/globals.css`
2. Prepend `"ABC Diatype"` to the body sans stack (Geist remains fallback)
3. Optionally wire `next/font/local` in `layout.tsx` (commented snippet)
4. If `ABCDiatypeMono-*` exists: add mono `@font-face` and point
   `.aomi-numeric` at `"ABC Diatype Mono"`; otherwise keep Geist Mono

| Step | Where | Shipping status |
| --- | --- | --- |
| Sans | Geist via `next/font/google` (`--font-geist-sans`) | Active |
| Mono | Geist Mono via `next/font/google` (`--font-geist-mono`) | Active |
| `@font-face` Diatype | Commented block in `globals.css` | Optional later |
| Optional preload | `layout.tsx` — `next/font/local` snippet in comments | Optional later |

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
commercial font binaries without a license. Until then, Geist Sans + Geist
Mono are the active portal fonts.

## Surface

- Hairline borders (`border-border` at ~50–70% opacity)
- Restrained fills; status color (amber / green / cyan) only for **real**
  status signals — not decorative bars on suggestion cards
- Dark charcoal chrome in dark mode; cool zinc in light mode (inherited tokens)
- Avoid purple glow, inset highlight tricks, and invented density chrome that
  does not map to Aomi product structure

## Icons

- Lucide only (`lucide-react`)
- Default size `size-3.5` / `size-4`, muted unless active
- Chat header chrome: `size-8` hit targets, consistent gap

## Utility classes (portal `globals.css`)

- `.aomi-eyebrow` — uppercase micro-label
- `.aomi-numeric` — Geist Mono + tabular nums
- `.aomi-card` — hairline bordered surface card

## Out of scope

- Cloning NeuralForge brand name, Billing panels, or fake ops metrics
- Aomi Build / Telegram visual forks beyond shared widget consumers of bumped package
- Pirating or committing unlicensed commercial font binaries
