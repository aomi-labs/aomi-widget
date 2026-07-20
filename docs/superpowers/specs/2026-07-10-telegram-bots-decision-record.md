# Telegram bots in Aomi Build — decision record

Date: 2026-07-10
Status: **decisions locked, blocked on backend.** Not a full design; no
implementation plan until the backend endpoint exists.
Scope: `apps/build` (replaces the Operate → Agents tab)

## Why this document

The Agents tab in Aomi Build's Operate section is low value: `OperateAgentsResult`
is `{ source, platform, agents: PlatformApp[] }` — literally a re-listing of the
builder's deployed apps, already covered by Projects and Deployments. We want to
replace it with **Bots**, so builders can attach a Telegram bot to a deployed app.

## What already exists (no invention needed)

The backend already implements Telegram bot registration, and the portal already
ships a working UI for it at `apps/portal/src/features/bots/bots.tsx`:

| Endpoint | Behaviour |
| --- | --- |
| `GET /api/account/bots` | `{ bot_registrations: BotRegistration[] }` |
| `POST /api/account/bots` | `{ platform: "telegram", default_app, label, credential, thread_mode }` — verifies the token with Telegram and **activates the webhook automatically** |

`BotRegistration` carries: `id`, `platform`, `status`, `label`, `default_app`,
`platform_bot_id`, `platform_username`, `webhook_url`, `thread_mode`,
`created_at`, `updated_at`, `disabled_at`.

The bot token is write-only ("Bot credentials are encrypted and never shown after
registration").

## The blocker: two different auth models

Aomi Build cannot call `/api/account/bots` today.

**Account auth** (portal, widget): identity is the canonical Aomi user
(`users.id`). `createBackendProxy` (`packages/account/src/proxy.ts:167`) resolves
the `better-auth.session_token` cookie and mints a per-request **AccountBearer**
(EdDSA, `sub` = canonical user id). The backend enforces scoping from `sub`.

**GitHub App auth** (Aomi Build): identity is a **GitHub user**. The session is
the `aomi_github` HS256 JWT cookie (signed with `PORTAL_ONLY_SESSION_SECRET`,
`sub` = githubUserId); the backend never sees it. The BFF calls the backend with
an omnipotent **service bearer** (`portalService().mint({ role: "service",
subject: "aomi-bff" })`) and passes `github_user_id` as a parameter. Scoping is
enforced **by the BFF**, not by the token.

Consequences:

- Aomi Build has no Better Auth session → no canonical user id → no AccountBearer.
- Its catch-all proxy allowlists exactly one route
  (`/api/integrations/github-app/oauth/start`); the portal's allowlists
  `/api/account/*` and the chat/thread surface.
- Because the service bearer is all-powerful, every Aomi Build BFF route **must**
  do its own ownership check. (This is exactly why the recent `activate`,
  `records`, and `app`-read holes were severe.)

## Decisions (locked)

1. **Ask the backend for a GitHub-scoped bots endpoint**, mirroring the existing
   owned-operate pattern:
   `/api/integrations/github-app/user/sources/:appSourceId/bots`
   (GET list, POST create). It uses the service bearer + `github_user_id`, and
   drops straight into `ownedSources()` alongside the other Operate views.

2. **Bot ownership keys off `app_source_id` / `application_id`** — not the
   canonical Aomi account. A bot belongs to a deployed app source. This resolves
   the data-model question raised during design: today a bot is owned by an Aomi
   account ("This account owns the bot configuration; people who message the bot
   still use their own Aomi identity").

3. **`default_app` is not a concern.** This feature is purely for non-default
   apps, so the bot binds to the specific deployed app rather than resolving a
   default. Note that app *names* are not globally unique across sources, which
   is a second reason to key on `app_source_id` / `application_id` rather than a
   bare name string.

4. **The Agents tab is replaced**, not supplemented.

## Backend ask (hand to the backend team)

- New routes under `/api/integrations/github-app/user/sources/:appSourceId/bots`
  (GET, POST), authorized by the service bearer + `github_user_id`, returning the
  existing `BotRegistration` shape.
- Bot ownership recorded against `app_source_id` (and/or `application_id`) rather
  than the canonical Aomi user id.
- Confirm whether existing account-owned bot registrations need a migration path,
  or whether the two ownership models coexist.
- Preserve the current registration behaviour: verify the token with Telegram and
  activate the webhook on create; never return the credential.

## Frontend sketch (once the endpoint lands)

- Nav: rename Operate → **Bots**, drop Agents; keep the existing
  `requiresGitHub` gating.
- Reuse the portal's `bots.tsx` structure (register form + registrations table +
  BotFather command list) restyled to control-plane tokens.
- Registration form fields: label (optional), bot token (masked), thread mode.
  The app is implied by the selected source/app rather than a `default_app`
  dropdown.
- Delete `operateAgentsRoute` and `listUserSourceAgents` once nothing references
  them.

## Next step

Brainstorm the full bots design **after** the backend confirms the endpoint shape
and the ownership column. Until then this file is the decision record, not a plan.
