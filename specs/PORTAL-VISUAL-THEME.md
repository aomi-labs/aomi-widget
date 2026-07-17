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

- **Sans (UI / body / titles):** ABC Diatype — portal override of
  `--font-geist-sans` and `body` to
  `"ABC Diatype", var(--font-inter), Inter, system-ui, sans-serif`
- **Mono (code / numerics):** Geist Mono — loaded via `next/font/google` as
  `--font-geist-mono`; amounts, credits, tokens, IDs, commits via
  `.aomi-numeric`. Prefer **ABC Diatype Mono** if licensed
  `ABCDiatypeMono-*` files are dropped; otherwise keep Geist Mono.
- Hierarchy: bold titles → medium row labels → muted metadata
- Eyebrow: ~10.5px, `letter-spacing: 0.09em`, muted foreground

### How Diatype is loaded (portal-only)

| Step | Where | Status |
| --- | --- | --- |
| Family stack | `apps/portal/src/app/globals.css` (`body`, `--font-geist-sans`) | Ready now |
| `@font-face` | Same file — commented block pointing at `/assets/fonts/diatype/ABCDiatype-{Regular,Medium,Bold}.woff2` | Uncomment after drop |
| Optional preload | `apps/portal/src/app/layout.tsx` — `next/font/local` snippet in comments | Enable after drop |
| Fallbacks | Inter via `next/font/google` (`--font-inter`); system-ui | Active while files missing |
| Mono | Geist Mono via `next/font/google`; optional `"ABC Diatype Mono"` faces in comments | Geist Mono active |

**Scope:** portal CSS only. Do **not** put Diatype into
`apps/shadcn-registry` default theme / widget-lib (that would force all
consumers). Portal overrides `--font-geist-sans` so shared widget chrome
inherits Diatype inside the portal shell without a package bump for fonts.

### Font files status (2026-07-17 search)

**ABC Diatype binaries were not found** on this machine or in the repo.

Searched (no matches for real font files; only unrelated `*MediaType*`
false positives under `node_modules`):

- Repo: `apps/portal/public`, design packages, full tree `*Diatype*` /
  `*ABCDiatype*`
- Host: `~/Downloads`, `~/Desktop`, `~/Documents`, `~/Library/Fonts`,
  `/Library/Fonts`, `~/Library/CloudStorage`, sibling `aomi-labs/*` trees,
  macOS Spotlight (`mdfind`)

Existing portal fonts under `public/assets/fonts/` remain Bauhaus Chez
Display + iA Writer Mono only.

**Drop licensed files here:**

```
apps/portal/public/assets/fonts/diatype/
```

See `apps/portal/public/assets/fonts/diatype/README.md` for exact filenames.
Do not vendor commercial font binaries without a license. Until files are
present, browsers fall through to Inter / system-ui.

Geist Mono continues to load from `next/font/google` in
`apps/portal/src/app/layout.tsx`.

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
