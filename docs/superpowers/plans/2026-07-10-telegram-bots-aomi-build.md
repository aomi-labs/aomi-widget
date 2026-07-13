# Telegram Bots in Aomi Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Aomi Build's low-value Operate → Agents tab with a **Bots** tab, letting a builder attach a Telegram bot to one of their deployed apps.

**Architecture:** The backend already implements the whole bot lifecycle (credential encryption, Telegram token verification, automatic webhook activation) behind `/api/account/bots`, which is authorized by a canonical-account bearer. Aomi Build has no such session — it has a GitHub session plus an omnipotent service bearer. So we add a **GitHub-scoped** route family that reuses the existing `BotRegistrationHandler`, and key bot ownership on the **application** (and therefore its `app_source_id`) rather than on a canonical Aomi user.

**Tech Stack:** Rust (axum, diesel, serde), Postgres migration, TypeScript (`packages/deploy`, Next.js BFF, React), cargo test, vitest.

## Global Constraints

- Two repos: `/Users/han/github/product-mono` (Rust backend) and `/Users/han/github/aomi-widget`.
- Bot credentials are **write-only**. Never return `credential_ciphertext` or the plaintext token in any response, log, or error.
- Ownership is keyed on `application_id` → `applications.app_source_id`. **Do not** resolve apps by bare name: `default_app_id()` (`handler/bot_registration.rs:221`) looks a name up with `limit 1`, and app names are **not unique across sources**.
- There is no "default app" concept in this feature — a bot binds to one specific deployed application.
- Every new GitHub-scoped route is service-bearer authorized and **must** verify ownership itself, exactly as `user_source_deployments` does (`endpoint/integration/github_app.rs:895`): load the source, compare `source.github_user_id`, else **404**. The service bearer grants no scoping of its own.
- Existing `/api/account/bots` routes keep working unchanged. The two ownership models coexist.
- Commit after every task. Never mark a task done with failing tests.

---

## File Structure

**`product-mono`:**
- Create: `supabase/migrations/<timestamp>_bot_registrations_optional_owner.sql` — make `owner_user_id` nullable.
- Modify: `aomi/crates/database/src/schema.rs` — `owner_user_id -> Nullable<Text>`.
- Modify: `aomi/crates/database/src/entities/bot_registration.rs` — optional owner, `list_by_app_source`.
- Modify: `aomi/bin/backend/src/handler/bot_registration.rs` — `create_for_application`, `list_for_app_source`, `disable_for_app_source`.
- Create: `aomi/bin/backend/src/endpoint/integration/github_app_bots.rs` — the three routes.
- Modify: `aomi/bin/backend/src/endpoint/integration/mod.rs` — mount them.

**`aomi-widget`:**
- Modify: `packages/deploy/src/types.ts` — `BotRegistration`, inputs.
- Modify: `packages/deploy/src/client.ts` — three methods; delete `listUserSourceAgents`.
- Modify: `apps/aomi-build/src/server/bff/operate/routes.ts` — bots routes; delete `operateAgentsRoute`.
- Create: `apps/aomi-build/src/app/api/bff/operate/bots/route.ts`.
- Create: `apps/aomi-build/src/features/operate/bots-view.tsx`.
- Delete: `apps/aomi-build/src/app/(control-plane)/operate/agents/`.
- Create: `apps/aomi-build/src/app/(control-plane)/operate/bots/page.tsx`.
- Modify: `apps/aomi-build/src/components/control-plane/control-plane-shell.tsx` — nav entry.

---

## Task 1: Make `owner_user_id` optional (product-mono)

A GitHub-only builder has no canonical `users.id`. Ownership will come from the application instead.

**Files:**
- Create: `/Users/han/github/product-mono/supabase/migrations/20260710000000_bot_registrations_optional_owner.sql`
- Modify: `/Users/han/github/product-mono/aomi/crates/database/src/schema.rs:214`
- Modify: `/Users/han/github/product-mono/aomi/crates/database/src/entities/bot_registration.rs`

**Interfaces:**
- Consumes: nothing.
- Produces: `DbBotRegistration.owner_user_id: Option<String>`; `NewBotRegistration::new(owner_user_id: Option<String>, platform, default_app_id, platform_bot_id, credential_ciphertext, webhook_secret)`.

- [ ] **Step 1: Write the migration**

```sql
-- Bots created from Aomi Build are owned by an application (and therefore by
-- its app_source), not by a canonical Aomi user. Account-owned bots keep
-- setting owner_user_id.
alter table bot_registrations
  alter column owner_user_id drop not null;

create index if not exists bot_registrations_default_app_id_idx
  on bot_registrations (default_app_id);
```

- [ ] **Step 2: Update the diesel schema**

In `aomi/crates/database/src/schema.rs`, line 214:

```rust
        owner_user_id -> Nullable<Text>,
```

- [ ] **Step 3: Run it to verify the crate fails to compile**

Run: `cd /Users/han/github/product-mono && cargo check -p aomi-database`
Expected: FAIL — `expected String, found Option<String>` in `bot_registration.rs`.

- [ ] **Step 4: Make the entity compile**

In `entities/bot_registration.rs`, change both structs:

```rust
pub struct DbBotRegistration {
    pub owner_user_id: Option<String>,
    // …unchanged fields
}

pub struct NewBotRegistration {
    pub owner_user_id: Option<String>,
    // …unchanged fields
}
```

and `NewBotRegistration::new`'s first parameter to `owner_user_id: Option<String>`.

Add the app-source-scoped list beside `list_by_owner`:

```rust
    /// Bots whose bound application belongs to `app_source_id`.
    pub async fn list_by_app_source(
        pool: &DbPool,
        app_source_id: i64,
    ) -> Result<Vec<DbBotRegistration>> {
        use crate::schema::{applications, bot_registrations};
        let mut conn = pool.conn().await?;
        Ok(bot_registrations::table
            .inner_join(applications::table.on(applications::id.eq(bot_registrations::default_app_id)))
            .filter(applications::app_source_id.eq(app_source_id))
            .filter(bot_registrations::disabled_at.is_null())
            .select(bot_registrations::all_columns)
            .load::<DbBotRegistration>(&mut conn)
            .await?)
    }
```

Fix the one existing `NewBotRegistration::new(owner_user_id, …)` call in `handler/bot_registration.rs::create` to pass `Some(owner_user_id.to_string())`.

- [ ] **Step 5: Run to verify it compiles and existing tests pass**

Run: `cd /Users/han/github/product-mono && cargo check -p aomi-database && cargo test -p aomi-backend bot_registration`
Expected: compiles; existing bot tests PASS.

- [ ] **Step 6: Commit**

```bash
cd /Users/han/github/product-mono
git add supabase/migrations/ aomi/crates/database/src/schema.rs aomi/crates/database/src/entities/bot_registration.rs aomi/bin/backend/src/handler/bot_registration.rs
git commit -m "feat(bots): allow application-owned bot registrations

owner_user_id becomes nullable so a bot can be owned by its bound
application (and thus its app_source) rather than a canonical Aomi user."
```

---

## Task 2: `create_for_application` on the handler (product-mono)

Reuses the entire existing create path — credential validation, Telegram verification, encryption, webhook activation — but binds by `application_id` instead of resolving a name.

**Files:**
- Modify: `/Users/han/github/product-mono/aomi/bin/backend/src/handler/bot_registration.rs`

**Interfaces:**
- Consumes: `DbBotRegistration::list_by_app_source` (Task 1).
- Produces:
  - `pub async fn create_for_application(&self, application_id: i64, req: CreateBotForAppRequest) -> Result<AccountBotRegistration, StatusCode>`
  - `pub async fn list_for_app_source(&self, app_source_id: i64) -> Result<Vec<AccountBotRegistration>, StatusCode>`
  - `pub async fn disable_for_app_source(&self, app_source_id: i64, id: &str) -> Result<(), StatusCode>`
  - `pub struct CreateBotForAppRequest { pub platform: String, pub label: Option<String>, pub credential: String, pub thread_mode: Option<String> }`

- [ ] **Step 1: Write the failing test**

Append to the `#[cfg(test)] mod tests` in `handler/bot_registration.rs`:

```rust
    #[tokio::test]
    async fn create_for_application_rejects_an_unknown_application() {
        let handler = test_handler().await;
        let result = handler
            .create_for_application(
                999_999,
                CreateBotForAppRequest {
                    platform: "telegram".into(),
                    label: None,
                    credential: "token".into(),
                    thread_mode: None,
                },
            )
            .await;
        assert_eq!(result.unwrap_err(), StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn create_for_application_rejects_an_unknown_platform() {
        let handler = test_handler().await;
        let result = handler
            .create_for_application(
                1,
                CreateBotForAppRequest {
                    platform: "myspace".into(),
                    label: None,
                    credential: "token".into(),
                    thread_mode: None,
                },
            )
            .await;
        assert_eq!(result.unwrap_err(), StatusCode::BAD_REQUEST);
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/han/github/product-mono && cargo test -p aomi-backend create_for_application`
Expected: FAIL — `cannot find function create_for_application`.

- [ ] **Step 3: Write minimal implementation**

```rust
pub struct CreateBotForAppRequest {
    pub platform: String,
    pub label: Option<String>,
    pub credential: String,
    pub thread_mode: Option<String>,
}

impl BotRegistrationHandler {
    /// Register a bot bound to a specific application. Ownership follows the
    /// application's `app_source_id`; `owner_user_id` stays NULL.
    pub async fn create_for_application(
        &self,
        application_id: i64,
        req: CreateBotForAppRequest,
    ) -> Result<AccountBotRegistration, StatusCode> {
        let platform = Self::normalize_platform(&req.platform).ok_or(StatusCode::BAD_REQUEST)?;
        let credential =
            Self::normalize_required(&req.credential).ok_or(StatusCode::BAD_REQUEST)?;
        let thread_mode = Self::normalize_thread_mode(req.thread_mode.as_deref())
            .ok_or(StatusCode::BAD_REQUEST)?;

        let app = DbApplication::get(&self.pool, application_id)
            .await
            .map_err(|error| {
                tracing::error!(error = %error, application_id, "Failed to load bot application");
                StatusCode::INTERNAL_SERVER_ERROR
            })?
            .ok_or(StatusCode::NOT_FOUND)?;

        let (platform_bot_id, platform_username) = self
            .validate_platform_credential(&platform, &credential, None, None)
            .await?;

        if DbBotRegistration::find_by_platform_bot(&self.pool, &platform, &platform_bot_id)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
            .is_some()
        {
            return Err(StatusCode::CONFLICT);
        }

        let cipher = BotCredentialCipher::from_env().map_err(|error| {
            tracing::error!(error = %error, "Failed to load bot credential cipher");
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
        let credential_ciphertext = cipher
            .encrypt(&credential)
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        let mut registration = NewBotRegistration::new(
            None,
            platform,
            app.id,
            platform_bot_id,
            credential_ciphertext,
            Self::generate_webhook_secret(),
        );
        registration.label = Self::normalize_optional(req.label);
        registration.platform_username = platform_username;
        registration.thread_mode = thread_mode;

        let mut row = DbBotRegistration::insert(&self.pool, registration)
            .await
            .map_err(|error| {
                let message = error.to_string().to_ascii_lowercase();
                if message.contains("duplicate") || message.contains("unique") {
                    StatusCode::CONFLICT
                } else {
                    tracing::error!(error = %error, "Failed to create bot registration");
                    StatusCode::INTERNAL_SERVER_ERROR
                }
            })?;

        if row.platform == "telegram" {
            let webhook_url =
                Self::telegram_webhook_url(&row.webhook_secret).ok_or(StatusCode::BAD_REQUEST)?;
            self.activate_telegram_webhook(&credential, &webhook_url).await?;
            row = Self::mark_webhook(&self.pool, row, &webhook_url).await?;
        }

        Ok(Self::account_registration(row, app.name))
    }

    pub async fn list_for_app_source(
        &self,
        app_source_id: i64,
    ) -> Result<Vec<AccountBotRegistration>, StatusCode> {
        let rows = DbBotRegistration::list_by_app_source(&self.pool, app_source_id)
            .await
            .map_err(|error| {
                tracing::error!(error = %error, "Failed to list bot registrations");
                StatusCode::INTERNAL_SERVER_ERROR
            })?;
        let mut out = Vec::with_capacity(rows.len());
        for row in rows {
            let app = self.default_app_name(row.default_app_id).await?;
            out.push(Self::account_registration(row, app));
        }
        Ok(out)
    }

    pub async fn disable_for_app_source(
        &self,
        app_source_id: i64,
        id: &str,
    ) -> Result<(), StatusCode> {
        let owned = DbBotRegistration::list_by_app_source(&self.pool, app_source_id)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        if !owned.iter().any(|row| row.id == id) {
            return Err(StatusCode::NOT_FOUND);
        }
        DbBotRegistration::disable_by_id(&self.pool, id)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        Ok(())
    }
}
```

Reuse the existing `mark_webhook` logic from `create` (extract it into `async fn mark_webhook(pool, row, url) -> Result<DbBotRegistration, StatusCode>` and call it from both `create` and `create_for_application` — do not duplicate it).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/han/github/product-mono && cargo test -p aomi-backend create_for_application`
Expected: PASS (2 passed).

- [ ] **Step 5: Commit**

```bash
cd /Users/han/github/product-mono
git add aomi/bin/backend/src/handler/bot_registration.rs
git commit -m "feat(bots): create/list/disable bots bound to an application

Binds by application_id instead of a bare app name (names are not unique
across sources) and leaves owner_user_id NULL."
```

---

## Task 3: GitHub-scoped bot routes (product-mono)

**Files:**
- Create: `/Users/han/github/product-mono/aomi/bin/backend/src/endpoint/integration/github_app_bots.rs`
- Modify: `/Users/han/github/product-mono/aomi/bin/backend/src/endpoint/integration/mod.rs`

**Interfaces:**
- Consumes: `create_for_application`, `list_for_app_source`, `disable_for_app_source` (Task 2).
- Produces:
  - `GET  /api/integrations/github-app/user/sources/:id/bots?github_user_id=&platform=` → `{ "bot_registrations": [...] }`
  - `POST /api/integrations/github-app/user/sources/:id/bots?github_user_id=&platform=` body `{ platform, application_id, label?, credential, thread_mode? }` → `{ "bot_registration": {...} }`
  - `DELETE /api/integrations/github-app/user/sources/:id/bots/:bot_id?github_user_id=&platform=` → `204`

- [ ] **Step 1: Write the failing test**

Create `github_app_bots.rs` with an inline test module:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn rejects_a_source_owned_by_another_github_user() {
        let backend = test_backend().await;
        let source = seed_source(&backend, "gh-owner").await;
        let err = ensure_owned_source(&backend, source.id, "gh-intruder")
            .await
            .unwrap_err();
        assert_eq!(err.0, StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn rejects_an_application_from_another_source() {
        let backend = test_backend().await;
        let source = seed_source(&backend, "gh-owner").await;
        let foreign_app = seed_application(&backend, 9_999).await;
        let err = ensure_app_in_source(&backend, source.id, foreign_app.id)
            .await
            .unwrap_err();
        assert_eq!(err.0, StatusCode::NOT_FOUND);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/han/github/product-mono && cargo test -p aomi-backend github_app_bots`
Expected: FAIL — module not declared / functions missing.

- [ ] **Step 3: Write minimal implementation**

```rust
//! GitHub-scoped bot registration. Service-bearer authorized; every route
//! verifies that the source belongs to `github_user_id` itself — the service
//! bearer grants no scoping of its own.

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
};
use serde::Deserialize;
use serde_json::{json, Value};

use crate::handler::{bot_registration::CreateBotForAppRequest, AomiBackend};

type ApiError = (StatusCode, Json<Value>);

#[derive(Deserialize)]
pub(crate) struct OwnedSourceQuery {
    github_user_id: String,
    platform: String,
}

#[derive(Deserialize)]
pub(crate) struct CreateBotRequest {
    platform: String,
    application_id: i64,
    label: Option<String>,
    credential: String,
    thread_mode: Option<String>,
}

fn not_found(msg: &str) -> ApiError {
    (StatusCode::NOT_FOUND, Json(json!({ "error": msg })))
}

/// Load the source and prove it belongs to this GitHub user, else 404.
/// Mirrors `github_app.rs::user_source_deployments`.
async fn ensure_owned_source(
    backend: &AomiBackend,
    source_id: i64,
    github_user_id: &str,
) -> Result<DbAppSource, ApiError> {
    let pool = backend.runtime.thread_store.pool();
    let source = DbAppSource::get(pool, source_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": format!("{e:#}") }))))?
        .ok_or_else(|| not_found("source not found"))?;
    if source.github_user_id.as_deref() != Some(github_user_id) {
        return Err(not_found("source does not belong to the GitHub user"));
    }
    Ok(source)
}

/// Prove the application is one of this source's apps, else 404.
async fn ensure_app_in_source(
    backend: &AomiBackend,
    source_id: i64,
    application_id: i64,
) -> Result<(), ApiError> {
    let pool = backend.runtime.thread_store.pool();
    let app = DbApplication::get(pool, application_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": format!("{e:#}") }))))?
        .ok_or_else(|| not_found("application not found"))?;
    if app.app_source_id != Some(source_id) {
        return Err(not_found("application does not belong to this source"));
    }
    Ok(())
}

pub(crate) async fn list_source_bots(
    State(backend): State<AomiBackend>,
    Path(id): Path<i64>,
    Query(query): Query<OwnedSourceQuery>,
) -> Result<Json<Value>, ApiError> {
    ensure_owned_source(&backend, id, query.github_user_id.trim()).await?;
    let bots = backend
        .bot_registrations
        .list_for_app_source(id)
        .await
        .map_err(|status| (status, Json(json!({ "error": "failed to list bots" }))))?;
    Ok(Json(json!({ "bot_registrations": bots })))
}

pub(crate) async fn create_source_bot(
    State(backend): State<AomiBackend>,
    Path(id): Path<i64>,
    Query(query): Query<OwnedSourceQuery>,
    Json(payload): Json<CreateBotRequest>,
) -> Result<Json<Value>, ApiError> {
    ensure_owned_source(&backend, id, query.github_user_id.trim()).await?;
    ensure_app_in_source(&backend, id, payload.application_id).await?;

    let bot = backend
        .bot_registrations
        .create_for_application(
            payload.application_id,
            CreateBotForAppRequest {
                platform: payload.platform,
                label: payload.label,
                credential: payload.credential,
                thread_mode: payload.thread_mode,
            },
        )
        .await
        .map_err(|status| (status, Json(json!({ "error": "failed to create bot" }))))?;

    Ok(Json(json!({ "bot_registration": bot })))
}

pub(crate) async fn delete_source_bot(
    State(backend): State<AomiBackend>,
    Path((id, bot_id)): Path<(i64, String)>,
    Query(query): Query<OwnedSourceQuery>,
) -> Result<StatusCode, ApiError> {
    ensure_owned_source(&backend, id, query.github_user_id.trim()).await?;
    backend
        .bot_registrations
        .disable_for_app_source(id, &bot_id)
        .await
        .map_err(|status| (status, Json(json!({ "error": "failed to disable bot" }))))?;
    Ok(StatusCode::NO_CONTENT)
}
```

Mount in `endpoint/integration/mod.rs` alongside the existing `user/sources/:id/...` service routes:

```rust
            "/github-app/user/sources/:id/bots",
            // GET  -> github_app_bots::list_source_bots
            // POST -> github_app_bots::create_source_bot
            "/github-app/user/sources/:id/bots/:bot_id",
            // DELETE -> github_app_bots::delete_source_bot
```

following the exact router-builder style used for `/github-app/user/sources/:id/deployments`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/han/github/product-mono && cargo test -p aomi-backend github_app_bots`
Expected: PASS (2 passed).

Run: `cargo clippy -p aomi-backend -- -D warnings`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
cd /Users/han/github/product-mono
git add aomi/bin/backend/src/endpoint/integration/
git commit -m "feat(bots): GitHub-scoped bot routes under user/sources/:id/bots

Service-bearer authorized; each route verifies source ownership and that the
application belongs to the source before touching a bot."
```

---

## Task 4: Deploy-client bot methods (aomi-widget)

**Files:**
- Modify: `/Users/han/github/aomi-widget/packages/deploy/src/types.ts`
- Modify: `/Users/han/github/aomi-widget/packages/deploy/src/client.ts`
- Test: `/Users/han/github/aomi-widget/packages/deploy/test/bots.test.ts`

**Interfaces:**
- Consumes: the routes from Task 3.
- Produces on `DeploymentClient`:
  - `listUserSourceBots(input: OwnedOperateSourceInput): Promise<BotRegistration[]>`
  - `createUserSourceBot(input: OwnedOperateSourceInput & { applicationId: number; botPlatform: string; credential: string; label?: string; threadMode?: string }): Promise<BotRegistration>`
  - `deleteUserSourceBot(input: OwnedOperateSourceInput & { botId: string }): Promise<void>`

> **Naming (binding):** `OwnedOperateSourceInput.platform` is the **deploy**
> platform (`"community"`). A bot's platform (`"telegram"`) is a different axis,
> so the create input names it **`botPlatform`** and the client maps it to the
> request body's `platform` field. Never introduce a `platform_` field.
- And the type:

```ts
export interface BotRegistration {
  id: string;
  platform: string;
  status: string;
  label: string | null;
  defaultApp: string;
  platformBotId: string;
  platformUsername: string | null;
  webhookUrl: string | null;
  threadMode: string;
  createdAt: number;
}
```

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from "vitest";
import { DeploymentClient } from "../src/client";

describe("DeploymentClient bots", () => {
  it("lists bots for an owned source", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          bot_registrations: [
            {
              id: "b1",
              platform: "telegram",
              status: "active",
              label: null,
              default_app: "binance",
              platform_bot_id: "123",
              platform_username: "mybot",
              webhook_url: "https://x/y",
              thread_mode: "single",
              created_at: 1,
            },
          ],
        }),
        { status: 200 },
      ),
    );
    const client = new DeploymentClient({
      aomi: { backendUrl: "https://api.test", activationToken: "t" },
      fetch: fetchImpl as unknown as typeof fetch,
    });

    const bots = await client.listUserSourceBots({
      githubUserId: "gh-1",
      platform: "community",
      appSourceId: 42,
    });

    expect(bots[0].platformUsername).toBe("mybot");
    expect(bots[0].defaultApp).toBe("binance");
    expect(fetchImpl.mock.calls[0][0]).toContain(
      "/api/integrations/github-app/user/sources/42/bots?",
    );
  });

  it("never surfaces a credential field", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          bot_registration: {
            id: "b1",
            platform: "telegram",
            status: "active",
            default_app: "binance",
            platform_bot_id: "1",
            thread_mode: "single",
            created_at: 1,
            credential_ciphertext: "LEAK",
          },
        }),
        { status: 200 },
      ),
    );
    const client = new DeploymentClient({
      aomi: { backendUrl: "https://api.test", activationToken: "t" },
      fetch: fetchImpl as unknown as typeof fetch,
    });
    const bot = await client.createUserSourceBot({
      githubUserId: "gh-1",
      platform: "community",
      appSourceId: 42,
      applicationId: 7,
      botPlatform: "telegram",
      credential: "tok",
    } as never);
    expect(JSON.stringify(bot)).not.toContain("LEAK");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/han/github/aomi-widget && pnpm exec vitest run packages/deploy/test/bots.test.ts`
Expected: FAIL — `client.listUserSourceBots is not a function`.

- [ ] **Step 3: Write minimal implementation**

Add to `client.ts` (following `listUserSourceDeployments`' shape, using `this.ownedOperateRequest(input)`):

```ts
  async listUserSourceBots(
    input: OwnedOperateSourceInput,
  ): Promise<BotRegistration[]> {
    const { appSourceId, params, platform, bearer } =
      this.ownedOperateRequest(input);
    const raw = await this.get<{ bot_registrations?: unknown[] }>(
      `/api/integrations/github-app/user/sources/${encodeURIComponent(
        String(appSourceId),
      )}/bots?${params.toString()}`,
      "list_user_source_bots",
      bearer,
    );
    await this.audit({ action: "list_user_source_bots", platform, appSourceId, ts: Date.now() });
    return ((raw.bot_registrations ?? []) as unknown[]).map(camelBotRegistration);
  }
```

`createUserSourceBot` POSTs `{ platform, application_id, label, credential, thread_mode }`; `deleteUserSourceBot` DELETEs `.../bots/${botId}?${params}`.

Add the parser — note it maps only known fields, so `credential_ciphertext` can never leak:

```ts
function camelBotRegistration(raw: unknown): BotRegistration {
  const b = (raw ?? {}) as Record<string, any>;
  return {
    id: String(b.id),
    platform: String(b.platform ?? ""),
    status: String(b.status ?? ""),
    label: b.label ?? null,
    defaultApp: String(b.default_app ?? b.defaultApp ?? ""),
    platformBotId: String(b.platform_bot_id ?? b.platformBotId ?? ""),
    platformUsername: b.platform_username ?? b.platformUsername ?? null,
    webhookUrl: b.webhook_url ?? b.webhookUrl ?? null,
    threadMode: String(b.thread_mode ?? b.threadMode ?? "single"),
    createdAt: Number(b.created_at ?? b.createdAt ?? 0),
  };
}
```

> Do **not** repeat the `camelOperateAppMetrics` bug: coalesce snake/camel with `??` first, then convert. Never `x === undefined || y === undefined ? null : …`.

Delete `listUserSourceAgents` and `OperateAgentsResult`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run packages/deploy/test/bots.test.ts && pnpm --filter @aomi-labs/deploy build`
Expected: PASS; build clean.

- [ ] **Step 5: Commit**

```bash
cd /Users/han/github/aomi-widget
git add packages/deploy/src/client.ts packages/deploy/src/types.ts packages/deploy/test/bots.test.ts
git commit -m "feat(deploy): bot registration client methods; drop listUserSourceAgents"
```

---

## Task 5: Bots BFF routes (aomi-build)

**Files:**
- Modify: `/Users/han/github/aomi-widget/apps/aomi-build/src/server/bff/operate/routes.ts`
- Create: `/Users/han/github/aomi-widget/apps/aomi-build/src/app/api/bff/operate/bots/route.ts`
- Delete: `/Users/han/github/aomi-widget/apps/aomi-build/src/app/api/bff/operate/agents/route.ts`
- Test: `apps/aomi-build/src/server/bff/operate/routes.test.ts`

**Interfaces:**
- Consumes: `ownedSources(req)` (existing, `routes.ts:98`), Task 4's client methods.
- Produces:
  - `GET /api/bff/operate/bots` → `{ sources, bots: (BotRegistration & { source })[] }`
  - `POST /api/bff/operate/bots` body `{ appSourceId, applicationId, credential, label?, threadMode? }` → `{ bot }`
  - `DELETE /api/bff/operate/bots?appSourceId=&botId=` → `{ ok: true }`

Writes must additionally verify that `appSourceId` is one of `owned.sources` before calling the client — the backend checks too, but the BFF must not rely on that (service bearer).

- [ ] **Step 1: Write the failing test**

```ts
it("401s the bots list when not signed in with GitHub", async () => {
  clearSession();
  const res = await operateBotsRoute(getReq());
  expect(res.status).toBe(401);
});

it("lists bots across owned sources", async () => {
  setSession({ githubUserId: "gh-1" });
  client.listUserSources.mockResolvedValue([{ id: 42, repositoryLink: "o/r", apps: [] }]);
  client.listUserSourceBots.mockResolvedValue([{ id: "b1", platformUsername: "mybot" }]);
  const res = await operateBotsRoute(getReq());
  expect(res.status).toBe(200);
  await expect(res.json()).resolves.toMatchObject({
    bots: [{ id: "b1", platformUsername: "mybot" }],
  });
});

it("404s a create for a source the user does not own", async () => {
  setSession({ githubUserId: "gh-1" });
  client.listUserSources.mockResolvedValue([{ id: 42, apps: [] }]);
  const res = await operateBotsCreateRoute(
    postJson({ appSourceId: 99, applicationId: 1, credential: "t" }),
  );
  expect(res.status).toBe(404);
  expect(client.createUserSourceBot).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter aomi-build exec vitest run src/server/bff/operate/routes.test.ts -t bots`
Expected: FAIL — `operateBotsRoute` is not exported.

- [ ] **Step 3: Write minimal implementation**

```ts
export async function operateBotsRoute(req: Request) {
  const owned = await ownedSources(req);
  if ("response" in owned) return owned.response;
  try {
    const results = await Promise.all(
      owned.sources.map(async (source) => {
        const bots = await owned.client.listUserSourceBots({
          githubUserId: owned.githubUserId,
          platform: owned.platform,
          appSourceId: source.id,
        });
        return bots.map((bot) => ({ ...bot, source }));
      }),
    );
    return NextResponse.json({
      sources: owned.sources,
      bots: results.flat(),
    });
  } catch (err) {
    return launchErrorResponse(err);
  }
}

export async function operateBotsCreateRoute(req: Request) {
  const owned = await ownedSources(req);
  if ("response" in owned) return owned.response;

  const body = (await req.json().catch(() => ({}))) as {
    appSourceId?: unknown;
    applicationId?: unknown;
    credential?: unknown;
    label?: unknown;
    threadMode?: unknown;
  };
  if (!isValidAppSourceId(body.appSourceId) || typeof body.applicationId !== "number") {
    return NextResponse.json(
      { error: "missing or invalid `appSourceId` / `applicationId`" },
      { status: 400 },
    );
  }
  if (typeof body.credential !== "string" || !body.credential.trim()) {
    return NextResponse.json({ error: "missing `credential`" }, { status: 400 });
  }
  const source = owned.sources.find((s) => s.id === body.appSourceId);
  if (!source) {
    return NextResponse.json(
      { error: "app source not found for this user" },
      { status: 404 },
    );
  }

  try {
    const bot = await owned.client.createUserSourceBot({
      githubUserId: owned.githubUserId,
      platform: owned.platform,
      appSourceId: source.id,
      applicationId: body.applicationId,
      botPlatform: "telegram",
      credential: body.credential.trim(),
      label: typeof body.label === "string" ? body.label : undefined,
      threadMode: typeof body.threadMode === "string" ? body.threadMode : undefined,
    });
    return NextResponse.json({ bot }, { status: 201 });
  } catch (err) {
    return launchErrorResponse(err);
  }
}
```

`operateBotsDeleteRoute` mirrors the same ownership check, then calls `deleteUserSourceBot`.

Create `apps/aomi-build/src/app/api/bff/operate/bots/route.ts`:

```ts
import {
  operateBotsCreateRoute,
  operateBotsDeleteRoute,
  operateBotsRoute,
} from "@build/server/bff/operate/routes";

export const GET = operateBotsRoute;
export const POST = operateBotsCreateRoute;
export const DELETE = operateBotsDeleteRoute;
```

Delete `operateAgentsRoute` and `apps/aomi-build/src/app/api/bff/operate/agents/route.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter aomi-build exec vitest run src/server/bff/operate/routes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/han/github/aomi-widget
git add apps/aomi-build/src/server/bff/operate/routes.ts apps/aomi-build/src/app/api/bff/operate/ apps/aomi-build/src/server/bff/operate/routes.test.ts
git commit -m "feat(aomi-build): bots BFF routes; remove agents route"
```

---

## Task 6: Bots view + nav (aomi-build)

**Files:**
- Create: `/Users/han/github/aomi-widget/apps/aomi-build/src/features/operate/bots-view.tsx`
- Create: `/Users/han/github/aomi-widget/apps/aomi-build/src/app/(control-plane)/operate/bots/page.tsx`
- Delete: `/Users/han/github/aomi-widget/apps/aomi-build/src/app/(control-plane)/operate/agents/`
- Modify: `/Users/han/github/aomi-widget/apps/aomi-build/src/components/control-plane/control-plane-shell.tsx`
- Modify: `/Users/han/github/aomi-widget/apps/aomi-build/src/features/operate/client.ts` (drop `"agents"` from `OperateKind`)
- Test: `apps/aomi-build/src/features/operate/bots-view.test.tsx`

**Interfaces:**
- Consumes: the BFF routes (Task 5), `useGitHubSession()` (existing).
- Produces: `export function BotsView()`.

Reuse the portal's `bots.tsx` structure (register form + table + BotFather command list) restyled to control-plane tokens (`border-border`, `bg-surface-1`, `text-dim`). Gate on `useGitHubSession()` exactly as `OperateView` does: loading → `LoadingPanel`; signed out → `GitHubSignInPanel`; never fetch while signed out.

- [ ] **Step 1: Write the failing test**

```tsx
it("shows the sign-in panel when not signed in with GitHub", () => {
  mockSession({ loading: false, signedIn: false });
  render(<BotsView />);
  expect(screen.getByRole("button", { name: /sign in with github/i })).toBeInTheDocument();
});

it("renders registered bots", async () => {
  mockSession({ loading: false, signedIn: true, githubLogin: "octocat" });
  operateFetch.mockResolvedValue({
    sources: [],
    bots: [
      {
        id: "b1",
        platform: "telegram",
        status: "active",
        label: "Trading assistant",
        defaultApp: "binance",
        platformUsername: "mybot",
        webhookUrl: "https://x",
        threadMode: "single",
        createdAt: 1,
      },
    ],
  });
  render(<BotsView />);
  expect(await screen.findByText("Trading assistant")).toBeInTheDocument();
  expect(screen.getByText("@mybot")).toBeInTheDocument();
  expect(screen.getByText("Configured")).toBeInTheDocument();
});

it("requires an app and a token before registering", async () => {
  mockSession({ loading: false, signedIn: true });
  operateFetch.mockResolvedValue({ sources: [], bots: [] });
  render(<BotsView />);
  expect(await screen.findByRole("button", { name: /register bot/i })).toBeDisabled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter aomi-build exec vitest run src/features/operate/bots-view.test.tsx`
Expected: FAIL — cannot resolve `./bots-view`.

- [ ] **Step 3: Write minimal implementation**

`BotsView` renders:
1. A **register** card: app `<select>` (options from `sources.flatMap(s => s.apps.map(a => ({ appSourceId: s.id, applicationId: a.id, name: a.name })))`), optional label, masked token input, thread-mode select, and a `Register bot` button disabled unless an app is chosen and the token is non-empty.
2. A **BotFather commands** card reusing the same command list as `apps/portal/src/features/bots/bots.tsx:47-57`.
3. A **Registered bots** table: Bot (label or `@username`), App, Thread mode, Webhook (`webhookUrl ? "Configured" : "Not configured"`), Status, Created, and a Remove action calling `DELETE`.

The token input is `type="password"`; after a successful create, clear it and never echo it. Copy the honest copy from the portal: "Bot credentials are encrypted and never shown after registration."

Create `app/(control-plane)/operate/bots/page.tsx`:

```tsx
import { BotsView } from "@build/features/operate/bots-view";

export default function OperateBotsPage() {
  return <BotsView />;
}
```

In `control-plane-shell.tsx`, replace the Agents nav item:

```tsx
      {
        label: "Bots",
        href: "/operate/bots",
        icon: Bot,
        enabled: true,
        requiresGitHub: true,
      },
```

Remove `"agents"` from `OperateKind` in `features/operate/client.ts` and delete the agents page directory.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter aomi-build exec vitest run src/features/operate/bots-view.test.tsx`
Expected: PASS (3 passed).

- [ ] **Step 5: Full verification**

```bash
cd /Users/han/github/aomi-widget
pnpm --filter aomi-build type-check && pnpm --filter aomi-build lint
pnpm --filter @aomi-labs/deploy build && pnpm exec vitest run packages/deploy/test/
pnpm --filter aomi-build exec vitest run
grep -rn "listUserSourceAgents\|operateAgentsRoute\|OperateAgentsResult" apps packages --include=*.ts --include=*.tsx || echo "no agents references remain"
```
Expected: all green; the grep prints "no agents references remain".

- [ ] **Step 6: Commit**

```bash
cd /Users/han/github/aomi-widget
git add apps/aomi-build/src/features/operate/ apps/aomi-build/src/app/\(control-plane\)/operate/ apps/aomi-build/src/components/control-plane/control-plane-shell.tsx
git commit -m "feat(aomi-build): replace Operate Agents tab with Bots

Builders can register a Telegram bot against a deployed app. Reuses the
backend's existing verification + webhook activation."
```

---

## Manual verification

1. Run the backend from `product-mono` with `BOT_CREDENTIAL_KEY` set; apply the migration.
2. `pnpm --filter aomi-build dev`; sign in via `/api/bff/auth/github/dev-session?login=octocat&id=1`.
3. Signed out → Operate → **Bots** nav item is greyed with the "Sign in" badge; visiting `/operate/bots` shows the sign-in panel and issues **no** fetch.
4. Signed in with a deployed app → the app appears in the register form's select.
5. Create a real bot in BotFather, paste the token, Register → row appears with `@username`, Webhook = **Configured**, Status = active. Message the bot on Telegram; it replies through the app.
6. The token is never returned: `curl -s localhost:3000/api/bff/operate/bots --cookie "aomi_github=<jwt>" | grep -i credential` → no output.
7. Ownership: `curl -X POST localhost:3000/api/bff/operate/bots -d '{"appSourceId":<other-user-source>,"applicationId":1,"credential":"x"}'` → **404**.
8. Remove the bot → row disappears; re-registering the same token succeeds (the row was disabled, and uniqueness is checked against non-disabled rows).
9. `/api/account/bots` still works from the portal (account-owned bots unaffected).

## Self-review notes

- **Spec coverage:** GitHub-scoped endpoint → Task 3. Ownership by `application_id` → `app_source_id` → Tasks 1-3. No `default_app` name resolution → Task 2 (`create_for_application` takes `application_id`; the name-lookup `default_app_id()` is untouched and still serves `/api/account/bots`). Agents tab replaced → Tasks 5, 6. Credentials never returned → Task 4's parser maps only known fields, asserted by a test.
- **Coexistence:** `/api/account/bots` keeps `owner_user_id = Some(...)`; the new routes leave it `NULL`. `list_by_owner` and `list_by_app_source` are disjoint queries, so neither surface sees the other's rows. This matches the decision record's "confirm whether the two ownership models coexist" — they do, by construction.
- **Type consistency:** `BotRegistration` is defined once (Task 4) and used in Tasks 5, 6. `CreateBotForAppRequest` is defined in Task 2 and consumed only in Task 3. `list_for_app_source` / `disable_for_app_source` keep those names across Tasks 2, 3.
- **Known follow-up (out of scope):** the `bot_registrations.default_app_id` column name is now a misnomer — it is the bound application, not a default. Renaming it is a separate migration.
- **Guard against a repeat bug:** Task 4 explicitly forbids the `camelOperateAppMetrics` snake/camel null-check pattern that shipped broken; the parser must `??`-coalesce before converting.
