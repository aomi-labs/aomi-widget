# Portal Visual Theme

Branch: `feat/chat-portal-visual-theme` (forked from `feat/chat-portal-settings-revamp`).

Portal visual language inspired by NeuralForge (dev-tool chrome) and fintech
swap-modal density. Keep Aomi product identity (logo, Connect wallet, real
suggestion prompts) — match the *feel*, not NeuralForge brand/content.

## Chat empty-state match (this pass)

Previous pass left `thread.tsx` alone. This pass restyles the **real** Aomi
empty chat so it reads like NeuralForge ops chrome:

| Surface | Approach |
| --- | --- |
| Welcome | Eyebrow micro-label + tighter title hierarchy (bold primary, muted secondary) — not soft giant greeting |
| Suggestion cards | Hairline bento cards, left status-accent bars (amber/green/cyan/info), muted meta line, mono on amounts (`1`, `100`) |
| Composer | Denser charcoal surface, hairline border, slightly sharper radius, tighter control row |
| Thread rail | Discussion-rail density: tighter rows, hairline separator, muted New Chat |
| Portal frame | Header/side chrome denser charcoal; portal CSS overrides + shared widget class tweaks |

**Do not** invent Billing/NeuralForge fake product data or a third fake column of
ops widgets. Aomi’s layout stays thread-rail + chat + composer; density and
surface language carry the 3-col ops *feel*.

### Shared package

Editing `apps/shadcn-registry` empty-state / rail chrome **requires** a
`@aomi-labs/widget-lib` patch bump (AGENTS.md). Portal keeps additional
token/font overrides in `apps/portal` only.

## Case rules

| Surface | Case | Example |
| --- | --- | --- |
| Titles, nav items, settings rows | Sentence or Title case | `Account Settings`, `Credits this month` |
| Micro-labels (section heads, column heads, IDs, tab chips) | ALL CAPS + wide tracking | `FROM`, `ASSETS`, `WORKSPACE`, `AVAILABLE` |
| Units / secondary copy | Lowercase or sentence | `credits`, `tokens`, descriptions |

Use `.aomi-eyebrow` for ALL CAPS micro-labels. Do not uppercase full sentences
or primary row labels.

## Typography

- **Sans (UI / body / titles):** ABC Diatype — portal override of
  `--font-geist-sans` and `body` to
  `"ABC Diatype", var(--font-inter), Inter, system-ui, sans-serif`
- **Mono (code / numerics):** Geist Mono — loaded via `next/font` as
  `--font-geist-mono`; amounts, credits, tokens, IDs, commits via
  `.aomi-numeric`
- Hierarchy: bold titles → medium row labels → muted metadata
- Eyebrow: ~10.5px, `letter-spacing: 0.09em`, muted foreground

### Font files status

**ABC Diatype font files are not in this repository.** Searched
`apps/portal/public/assets/fonts` and the wider repo — no `*Diatype*` /
`*ABCDiatype*` webfonts (only Bauhaus Chez Display + iA Writer Mono are
present under `public/assets/fonts`). Until licensed `.woff2` / `.otf`
files are added and wired with `@font-face`, browsers fall through to
Inter (loaded via `next/font/google` as `--font-inter`) / system-ui.
Do not vendor commercial font binaries without a license.

Geist Mono continues to load from `next/font/google` in
`apps/portal/src/app/layout.tsx`.

## Surface

- Hairline borders (`border-border` at ~50–70% opacity)
- Bento / rounded cards via `.aomi-card` / suggestion card chrome
- Restrained fills; status color (amber / green / cyan) for signal only
- Dark charcoal chrome in dark mode; cool zinc in light mode (inherited tokens)

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
