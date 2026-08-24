# Aomi `/v2` nav bar — locked details

Locked 2026-08-17 with Cecilia. Source of truth for the landing nav IA, product split, solutions motions, and current branding. Code mirror: `apps/landing/app/v2/site.ts` and `apps/landing/app/v2/copy.ts`. Preview: `http://localhost:3000/v2`. Live homepage stays at `/` until cutover.

This is a **plan**, not a claim that every inner page is fully written. News and Pricing are explicit placeholders. Hero CTAs (“Read the docs” / “Book a call”) were removed.

---

## Content rule (from Para)

Steal Para’s **content architecture**, not the orange chrome.

- Nav is a **catalog**, not a manifesto.
- Each dropdown row is a **named noun** plus a **4–7 word job line**.
- Pipeline, KEYS = 0, simulate-before-sign, MPC-style proofs belong in **body copy**, not in the top bar.
- Products = what you pick up. Solutions = who it’s for and **how they buy**. Resource / Developers = company and docs. Right side = go there.

Aomi `/v2` previously led with philosophy (“Between an agent’s decision and its settlement”) and Docs / Agents / Apps. That is what we are replacing.

---

## Chrome

```
[ aomi ]  Products  Solutions  Resource  Developers  Pricing          Console   App
```

| Side | Items |
| --- | --- |
| Left | Logo → `/v2` |
| Menus | Products, Solutions, Resource, Developers (dropdowns), Pricing (link, no dropdown) |
| Right | **Console** (ghost) → `https://build.aomi.dev`; **App** (primary) → `https://chat.aomi.dev` |

**Plugin SDK vs Console:** same URL, two treatments. Products dropdown **explains** Build. Right-side Console is the **login / go** CTA.

**App** is chat.aomi.dev (the human Transact portal), not “Aomi Apps” the plugin SKU.

---

## Branding and hero (locked copy)

Eyebrow: `EXECUTION INFRASTRUCTURE`

Headline: **Execution harness for onchain Finance**

Support:

> A hosted solution for blockchain automation. Clients bring APIs, we bring the harness that execute across protocols and blockchains. Build, simulate, sign, broadcast. Wallets stays with users.

Not a wallet. Not a chat-widget company. Aomi sits **above** the existing signer: construct → simulate → sign → broadcast. Wallets stay with users.

Backers (About): **Anagram** and **Nascent**.

Visual direction for the bar: Para-like full-width catalog (title + job, icon row). Aomi tokens still apply (purple accent, existing `/v2` type). Do not flatten landing copy into “MCP chats with one Aomi agent.”

Reference briefs (solutions proof, not public nav labels):

- Fintech: https://scrum.aomi.dev/api/core/asset-mgmt
- DeFi / venues: https://scrum.aomi.dev/api/core/trading
- Wallets: https://scrum.aomi.dev/api/core/wallets
- Research index: https://aomi.dev/research

---

## Two offerings

Everything in the bar hangs off these two products. Shared substrate: **stage → simulate → commit** on EVM and SVM. That is the tx pipeline. What changes is who owns the agent loop, and whether Aomi hosts the partner’s agent.

### 1. Transact

Language → simulated, signable transaction. Aomi does **not** host the partner’s product agent here (no “your App as data in our serverless runtime”). Three pickup layers on the same pipeline:

| Layer | Who | Surface |
| --- | --- | --- |
| Portal | Humans | chat.aomi.dev — Aomi runs the inner agent loop; user wallet signs |
| CLI & MCP | External / coding agents | Terminal + Claude Code / Cursor / Codex |
| REST APIs | Integrators | Lowest-level HTTP / React client |

Two APIs under Transact:

| API | Loop | Job |
| --- | --- | --- |
| **Pipeline API** | None. Caller’s agent owns the loop. | Raw catalog + guarded lifecycle. BYOA. No Aomi inference. |
| **Agents API** | Aomi runtimes run **subagents in parallel**. | Outer model (Claude) **keeps judgment and the tx decision**. It calls Aomi to orchestrate subagents for heavy work, then Claude decides. |

Founder lock (overrides older unification-plan wording that said “Claude drives one Aomi agent”): **Claude orchestrates Aomi subagents in parallel.** Landing must not flatten this.

Signing never happens over MCP. Wallet client (web / CLI / widget adapter) signs.

### 2. Build (Plugin SDK)

“Vercel for crypto agents” is an **analogy**, not official copy. Public names: **Aomi Build**, hosted control plane, Aomi Apps.

- Ship an **Aomi App**: prompt + tools (plugin wrapping the client’s APIs).
- Aomi loads it as data in a **shared runtime** (no per-app servers) and **does** orchestrate the model↔tool loop.
- Those loops transact over the **same Transact pipeline**.
- Widget, Telegram, chat.aomi.dev are **channels**, not the product.

Buyers: platforms, wallets, builders. End users live on Chat.

---

## Products dropdown

Transact three ways, then Build once. Widget is **not** a Product; it appears under Solutions as how a partner ships chat-to-trade.

| Item | Offering | Job line | Notes |
| --- | --- | --- | --- |
| **Portal** | Transact, humans | Chat-to-trade in the browser | chat.aomi.dev. Aomi runs the agent loop; wallet signs. |
| **CLI & MCP** | Transact, agents | Same pipeline from the terminal and coding agents | `aomi` CLI + MCP. Outer agents drive Aomi; signing still hands off. |
| **REST APIs** | Transact, integrators | Agents APIs that orchestrate subagents building transactions from intent. Pipeline API that exposes the underlying tool layer directly to integrators. | Two contracts, one product group. Agents API = Claude + parallel subagents. Pipeline API = no loops, raw tools. |
| **Plugin SDK** | Build | Rust SDK and tooling for building applications on Aomi's hosted platform | build.aomi.dev. Explains the SKU; right-side Console is the CTA. |

---

## Solutions dropdown

Split by **buyer** and **how they buy**, not only industry label.

| Tab | Buyer | Motion | What they get |
| --- | --- | --- | --- |
| **Fintech** | Vaults, asset managers, RWA, tokenization | Deep integration / **white-label** | AI automation onchain: auto-balancing, pool management, mandate-enforced execution. Strategy stays with them. Somm is the production proof. |
| **DeFi** | CEX/DEX venues and frontends | **Out-of-the-box** / UI component | Widget for chat-to-trade, optional order-book API as an App, or Pipeline API as integrator. |
| **Trading** | The trader’s own desk | Hosted App **or** BYOA | Cross-venue arb on Build, or their agent on Agents / Pipeline API. Not the venue. |
| **NFT** | Marketplaces | **Hosting as a service** | We host the bots; later many bots per branded platform, including end-user one-shot light agents. |
| **Wallets** | Self-custody, retail fintech, embedded-wallet providers | Out-of-the-box **Transact** | Aomi *is* the agent. Chat-to-trade **above the existing signer**. One-sprint embed, keys never move. |

**DeFi vs Wallets:** both can be a widget. DeFi is the venue’s trading surface (order types, their book). Wallets is the wallet’s own agent (white-label Transact, signer unchanged).

**DeFi vs Trading:** venue/frontend vs the trader’s desk.

---

## Resource dropdown

| Item | Job | Status |
| --- | --- | --- |
| **About** | Backed by Anagram and Nascent | Skeleton |
| **Research** | Execution harnesses, auth, AomiBench | Points at existing research (`/research`, https://aomi.dev/research) |
| **News** | Announcements and press | **Placeholder** until there are posts |
| **Contact** | Talk to us | `/v2/contact` |

Label in the bar is **Resource** (singular), as specified.

---

## Developers

No “Developer” mega-product. Two destinations:

| Item | Job | Destinations |
| --- | --- | --- |
| **Documentation** | How to transact and how to build | `/docs` (prod: https://aomi.dev/docs/) |
| **Agents** | agents.md for coding agents | `/agents.md` (prod: https://aomi.dev/agents.md) |

---

## Pricing

One individual page covering both Transact and Build. **Copy later.** Seed if needed: usage-based rails already on the scrum briefs (sandbox, hosted runtime, bps on executed flow) — not locked as public pricing.

---

## What we explicitly do not put in the nav

- Widget / AomiFrame as a top-level Product (channel).
- “Vercel for crypto agents,” “Serverless Agents,” “Unhosted Pipeline” as SKU names.
- Pipeline stages (Build / Simulate / Sign / Broadcast) as nav items.
- Telegram / Discord / iOS as products (channels of Build or Portal).
- Flattening Agents API into “one Aomi agent Claude chats with.”

---

## Route map (skeleton)

Internal pages live under `/v2`. Home body below the bar is still the old v2 sections until a later pass.

| Path | Page |
| --- | --- |
| `/v2` | Home (new bar + updated hero; rest of page not rewritten) |
| `/v2/products/portal` | Portal |
| `/v2/products/cli-mcp` | CLI & MCP |
| `/v2/products/api` | REST APIs |
| `/v2/products/console` | Plugin SDK |
| `/v2/solutions/fintech` | Fintech |
| `/v2/solutions/defi` | DeFi |
| `/v2/solutions/trading` | Trading |
| `/v2/solutions/nft` | NFT |
| `/v2/solutions/wallets` | Wallets |
| `/v2/about` | About |
| `/v2/research` | Research |
| `/v2/news` | News (placeholder) |
| `/v2/contact` | Contact |
| `/v2/pricing` | Pricing (placeholder) |
