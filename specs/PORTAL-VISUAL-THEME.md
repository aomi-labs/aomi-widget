# Portal Visual Theme

Branch: `feat/chat-portal-visual-theme` (forked from `feat/chat-portal-settings-revamp`).

Portal visual language: dense **ops / fintech** dark UI — deep charcoal
near-black, hairline borders, ALL CAPS tracked micro-labels, tabular mono
numbers, and a single restrained accent. Keep Aomi product identity (logo,
Connect wallet, real suggestion prompts) — match the *feel*, not reference
brand/content.

**Shipping typography:** Geist Sans (UI) + Geist Mono (numbers / code / IDs).
A short mono-everywhere (body = Mono) experiment on this branch was reverted;
do not treat mono-first as the shipping default.

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

## Direction (Sans + Mono)

| Token | Choice |
| --- | --- |
| Primary UI font | **Geist Sans** — body, chrome, labels, empty state, settings, rail |
| Mono (scoped) | **Geist Mono** — `.aomi-numeric`, `font-mono`, code, IDs, amounts, commits |
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
token/font overrides in `apps/portal` only — charcoal + typography polish on
this branch is **portal-scoped** when possible (no widget-lib bump unless
shared empty-state chrome changes).

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

## Rico design cheatsheet (canonical)

Locked rules for portal visual work on this branch (and the later P0–P2
premium pass). Prefer these over older ad-hoc choices.

| Axis | Rule |
| --- | --- |
| Typography weights | **Only 2:** Regular (`400` / `font-normal`) for body; Medium (`500` / `font-medium`) for headings and emphasis. No `font-semibold` / `font-bold` proliferation — map “bold” titles to **medium**. |
| Colors | [TailwindCSS neutral palette](https://tailwindcss.com/docs/colors) — prefer `neutral` / `zinc` ladder for chrome; keep semantic status green/red sparse. |
| Radius | **8–12px only** (`0.5rem`–`0.75rem`). No softer blobs, no hairline-sharp 2px. |
| Icons | **Hugeicons** (not Lucide for new portal work). Target Solid; free npm is Stroke Rounded until Pro is licensed. |

### Weight mapping

| Intent | Tailwind | CSS |
| --- | --- | --- |
| Body / secondary | `font-normal` | `400` |
| Headings, labels, emphasis | `font-medium` | `500` |
| Avoid | `font-semibold`, `font-bold`, `font-extrabold` | `600+` |

Geist Sans + Geist Mono remain the shipping families. Reference UIs that look
“medium/bold” on titles still map to **medium only** here.

### Radius clamp

| Token | Value | Notes |
| --- | --- | --- |
| `--radius` | `0.625rem` (10px) | Mid of 8–12px band |
| Cards / composer | `calc(var(--radius) + 2px)` ≈ 12px max | Do not exceed 12px |
| Avoid | `rounded-2xl`+ soft blobs, `rounded-sm` sharp corners | Outside Rico band |

### Neutral palette mapping (portal tokens → Tailwind)

| Portal token (dark) | Approx Tailwind neutral/zinc |
| --- | --- |
| `--background` `oklch(0.09…)` | `neutral-950` / near `zinc-950` |
| `--sidebar` `oklch(0.10…)` | between `neutral-950`–`900` |
| `--card` / `--popover` `oklch(0.125…)` | `neutral-900` |
| `--muted` / `--secondary` `oklch(0.15–0.16…)` | `neutral-800` |
| `--muted-foreground` `oklch(0.58…)` | `neutral-400`–`500` |
| `--foreground` `oklch(0.93…)` | `neutral-50`–`100` |
| `--border` / `--input` white @ 8–10% | hairline on dark (Tailwind `white/10` feel) |

Light mode inherits cool zinc from shared theme tokens; dark overrides stay on
the charcoal/neutral ladder above — do not introduce purple or warm cream.

## Typography

Shipping fonts (always loaded via `next/font/google` in
`apps/portal/src/app/layout.tsx`):

- **Sans (UI / body / titles):** Geist Sans — `--font-geist-sans` on
  `body` / `font-sans`. Stack:
  `var(--font-geist-sans), "Geist", system-ui, sans-serif`
- **Mono (code / numerics):** Geist Mono — `--font-geist-mono`; amounts,
  credits, tokens, IDs, commits via `.aomi-numeric` or `font-mono`
- Hierarchy: **medium** titles → medium row labels → muted metadata (weights
  only 400/500 — see Rico cheatsheet)
- Eyebrow: ~10.5px, `letter-spacing: 0.09em`, muted foreground (inherits sans)

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
| Sans (primary UI) | Geist via `next/font/google` (`--font-geist-sans`) | Active |
| Mono (numerics / code) | Geist Mono via `next/font/google` (`--font-geist-mono`) | Active |
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

- Hairline borders (`border-border` / `oklch(1 0 0 / 8%)` in dark)
- Restrained fills; `--portal-accent` (status green) only for **real**
  status / sparse emphasis — not decorative bars on suggestion cards
- Deep charcoal chrome in dark mode; cool zinc in light mode (inherited tokens)
- Avoid purple glow, inset highlight tricks, and invented density chrome that
  does not map to Aomi product structure

## Icons

- **Hugeicons** for portal-owned surfaces (settings, account menu, frame gear,
  launch/deploy). Adapter: `apps/portal/src/components/icons/`
  (`PortalIcon` + Lucide-shaped `Icons` map).
- Packages (portal-scoped): `@hugeicons/react` + `@hugeicons/core-free-icons`
  (MIT free = **Stroke Rounded** only). Rico asks for **Solid**; Pro solid
  (`@hugeicons-pro/core-solid-rounded` etc.) needs the private Hugeicons
  registry + license — swap icon package imports when available; keep adapter.
- **Do not** add new `lucide-react` imports in portal. Existing Lucide in
  `@aomi-labs/widget-lib` / shadcn-registry chat chrome stays until a separate
  widget-lib bump (portal-first to limit blast radius).
- Default size ~14–16px (`size={14}` / `size={16}`), muted unless active
- Chat header chrome: `size-8` hit targets, consistent gap

## Utility classes (portal `globals.css`)

- `.aomi-eyebrow` — uppercase micro-label
- `.aomi-numeric` — Geist Mono + tabular nums
- `.aomi-card` — hairline bordered surface card

## Out of scope

- Cloning reference brand names, Billing panels, or fake ops metrics
- Reintroducing fake AI chrome (section stamps, rainbow accent bars)
- Mono-everywhere body font (reverted experiment)
- Aomi Build / Telegram visual forks beyond shared widget consumers of bumped package
- Pirating or committing unlicensed commercial font binaries
- Merging this branch into `main` / prod without explicit review

## Reference review (2026-07-17)

Four premium dark SaaS/fintech refs (Acme glass table, Inbox AI agent,
analytics bars, crypto wallet). **Match feel, not product.** Approve
phased plan before implementing.

### What the refs share

| Axis | Pattern |
| --- | --- |
| Palette | Near-black charcoal layers (`~#0B–0D`), off-white primary, mid muted gray |
| Type | Geometric sans body + tabular nums; medium titles (map bold → medium), quiet meta |
| Caps | ALL CAPS + tracking only on true micro-labels (`DATA UPDATED`, column heads) — not nav titles |
| Radius | Consistent ~8–12px cards/controls (not soft-blob 20px+, not sharp 2px) |
| Borders | 1px hairline light-on-dark; depth from value shifts, almost no drop shadow |
| Glass | Soft `backdrop-blur` + translucent fill **only** on overlays/popovers — not whole chrome |
| Accents | One semantic accent (green/teal success, red danger); sparse brand pops in data only |
| Icons | Hugeicons (Solid target; free Stroke interim), muted until active; small hit targets |

### TAKE

- Layered charcoal / Tailwind **neutral** ladder (bg → sidebar → card → overlay), hairline borders, muted meta
- Geist Sans + Geist Mono tabular (confirmed — **not** mono-everywhere)
- Font weights **400 / 500 only** (body regular, headings medium)
- Radius **8–12px**; base `--radius` ≈ 10px (`0.625rem`)
- Hugeicons for portal chrome (Solid when Pro licensed; free Stroke until then)
- Status green for real positive deltas / live status only
- Soft glass for **modals, menus, hover popovers** only
- Caps rules already in this doc (settings/tables/deploy — never empty-state stamps)
- High-contrast primary CTA (white fill / dark text) sparingly

### AVOID (anti-slop)

- Wallpaper / scenic blur behind the whole app
- Purple/indigo glow borders, neon rings, multi-accent rainbow pills
- Fake Acme Inbox IA (AI AGENT rail, Create agent hero card, Billing metrics)
- Decorative left status bars / section stamps on suggestion cards
- Heavy glass on thread rail, composer, or every card
- Soft multi-layer shadows, rounded-full pill clusters for density theater
- New **Lucide** icons on portal-owned surfaces
- `font-semibold` / `font-bold` title stacks; radius outside 8–12px

### Token deltas (portal `globals.css`)

| Token | Direction |
| --- | --- |
| `--background` / `--sidebar` / `--card` | Keep ~0.09 / 0.10 / 0.125 charcoal ladder (neutral mapping above); optional `--portal-overlay` for blur cards |
| `--border` / `--input` | Stay ~8–10% white; don’t brighten to “outlined everything” |
| `--muted-foreground` | Keep mid-gray (~0.58); don’t crush to near-invisible |
| `--portal-accent` | Stay status green; add explicit `--portal-status-danger` if missing in use |
| `--radius` | **Clamp 8–12px** — base `0.625rem` (10px); cards ≤12px |
| `.aomi-card` | Opaque/near-opaque hairline by default |
| `.aomi-glass` (new, optional P1) | `backdrop-filter` + translucent fill — **overlays only** |

### Surface priority

1. **P0** — Token polish + composer + suggestion cards + thread rail density (portal CSS first; widget-lib only if shared chrome must change)
2. **P1** — Settings modal + account menu as glass overlays; settings tables/eyebrows; Connect wallet CTA contrast
3. **P2** — Deployments / project lists as denser fintech tables (real columns only); status pills; no invented charts

### Scope

- **Default:** portal-only CSS/layout overrides; keep `main` untouched
- **Widget-lib bump:** only if shared empty-state / composer / rail classes in `apps/shadcn-registry` must change
- **Do not** ship Inbox-style product features or wallpaper glass shell
