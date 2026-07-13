# Required-secret detection and activation gating

Date: 2026-07-10
Status: approved, ready for implementation planning
Scope: `packages/deploy`, `apps/aomi-build`, `apps/portal`

## Problem

Aomi SDK apps declare the secrets they need, structurally, at the source level.
The `binance` app is representative:

```rust
const SECRET_API_KEY: Secret = Secret::new(
    "BINANCE_API_KEY",
    "Binance dashboard API key for spot trading...",
    true, // required
);
```

These are registered through the `dyn_aomi_app!` macro's `secrets` parameter.

Aomi Build's Environment tab, however, asks builders to type arbitrary `KEY` /
value pairs with no idea which keys the app actually needs. A builder who
activates the binance app without setting `BINANCE_API_KEY` gets an app that
**activates but never loads** — the failure surfaces late, at runtime, with no
indication of the cause.

The declared-secret data already exists on the backend. `GET /api/thread/apps`
returns it today, and the type is already modelled in this repo:

```ts
// packages/client/src/types.ts:356-363
/** ... so the frontend can render input rows and
 *  gate app load on `required` slots being filled. */
export interface AomiSecretSlot {
  name: string;
  description: string;
  required: boolean;
}
```

The CLI already consumes it (`packages/client/src/cli/commands/control.ts:83`
prints `[requires: BINANCE_API_KEY, BINANCE_SECRET_KEY]`).

The gap: Aomi Build talks to the **deploy/platform** API
(`packages/deploy` → `PlatformApp`), not the chat/session API, and
`PlatformApp` carries no secret slots.

## Goal

Detect an app's required secrets, prompt the builder to fill them **before
activation**, and refuse to activate until every required slot has a value.

## Non-goals

- Reading secret *values* back. The vault is write-only by design; only key
  names are ever returned. Unchanged.
- Validating secret values (e.g. calling Binance to check the key works).
- Distinguishing "environment variable" from "secret" in the backend. That
  split remains cosmetic/entry-time, as shipped.

## Approach

Put the declared slots on the platform-app payload, which is the layer Aomi
Build already reads.

### 1. Data — `packages/deploy`

Add the wire shape to `packages/deploy/src/types.ts`. Declare it locally rather
than importing `AomiSecretSlot` from `packages/client`: this is the backend's
wire shape, both packages parse it independently, and `deploy` must not take a
dependency on `client`.

```ts
export interface SecretSlot {
  name: string;
  description: string;
  required: boolean;
}

export interface PlatformApp {
  // ...existing fields
  secrets?: SecretSlot[];
}
```

Populate it in `camelPlatformApp` (`packages/deploy/src/client.ts:1390`):

```ts
secrets: Array.isArray(a.secrets) ? a.secrets : [],
```

`camelPlatformApp` is the single choke point through which every platform-app
object enters the frontend — `listApps` (`:566`), `getApp` (`:589`),
`listUserSourceAgents` (`:736`), and `camelUserSource`'s `apps` (`:1461`). One
line therefore feeds the project page, the wizard, and the Environment tab.

**Backend dependency (verify first).** `camelPlatformApp` silently drops any
field not in its return literal, so if the backend already emits `secrets` on
`/api/platforms/:platform/apps`, it is being discarded today and this becomes a
pure frontend change. Confirm against a real payload before assuming backend
work. If the field is absent, the backend must add it — additive, on an
existing response, and it is the same fact `/api/thread/apps` already
publishes.

### 2. Computation — a pure helper

Configured key names are already readable via `listAppSecrets` →
`{ byApp: Record<appName, string[]> }` (names only; handles are
`$SECRET:APP:<app>::<KEY>`, stripped to `<KEY>`).

```ts
// packages/deploy/src/secrets.ts (new)
export function missingRequiredSecrets(
  slots: SecretSlot[] | undefined,
  configuredKeys: string[],
): SecretSlot[];
```

Returns the required slots whose `name` is not present in `configuredKeys`.
Optional slots never gate. Exact-match on name (no case folding — env var
names are case-sensitive).

### 3. UI — `apps/aomi-build`

Two call sites invoke `launchActivate`, and **both** gate:

- the wizard's `DeployStep` (`features/launch/components/deploy-step.tsx`)
- the project page's `LifecyclePanel`
  (`features/launch/components/deploy-dashboard.tsx`)

Behaviour when an app has unfilled required slots:

- The **Activate** button is disabled, with a short reason
  ("2 required secrets missing").
- The missing slots render as **prefilled rows in the Secrets section** of the
  existing Environment editor: `name` pre-populated and read-only, the SDK's
  `description` as helper text, a masked (`type="password"`) value input.
- Saving goes through the existing `detail.setEnvVars(app, values)` path, then
  refreshes the configured-key list; the gate re-evaluates and Activate enables.

This reuses the Env/Secret split already shipped in `environment-tab.tsx` —
required slots simply become named, explained, mandatory rows rather than
something the builder must know to type.

The Environment tab additionally surfaces a banner listing required-but-missing
slots for the selected app, so the requirement is discoverable outside the
activate flow.

### 4. Backstop — the BFF `activate` route

A client-side gate is bypassable, and the same hole would exist for any other
consumer. `activateLaunchRoute` therefore re-checks server-side, **after** the
existing session + source-ownership + `(app, releaseTag)` pair validation and
**before** `client.activate`:

- The route already holds the owned `source` from `findOwnedSource`, and
  `source.apps` is parsed by `camelPlatformApp` (`client.ts:1461`) — so once
  step 1 lands, the slots are **already in hand**. No extra `listApps` /
  `getApp` call.
- Fetch configured keys once via `listAppSecrets({ githubUserId, sourceId })`.
- Check **only the apps named in the activate request** (`body.apps`), not every
  app on the source.
- If any required slot is unfilled, return **409** with the missing names:

```json
{ "error": "missing required secrets",
  "missing": { "binance": ["BINANCE_API_KEY", "BINANCE_SECRET_KEY"] } }
```

Applied to all **three** copies of the route, so portal and the package BFF
inherit it:

- `apps/aomi-build/src/server/bff/launch/routes.ts`
- `apps/portal/src/server/bff/launch/routes.ts`
- `packages/deploy/src/bff/launch-routes.ts`

(The three-way duplication is pre-existing and is why the recent activate
hardening had to land three times. Consolidating it is out of scope here but
worth a follow-up.)

The frontend surfaces the 409's `missing` map in the activate error panel,
rather than a generic failure.

## Data flow

```
GET /api/platforms/:p/apps        -> camelPlatformApp -> PlatformApp.secrets[]
GET /api/bff/deployments/secrets  -> listAppSecrets   -> { byApp: string[] }
                                          |
                        missingRequiredSecrets(slots, configuredKeys)
                                          |
                    +---------------------+---------------------+
                    |                                           |
            UI: disable Activate,                   BFF: 409 + missing map
            prefill Secrets rows                    before client.activate
```

## Error handling

- Slots absent (`secrets` undefined or `[]`) → no gate, current behaviour. An
  app that declares nothing must keep activating exactly as it does today.
- `listAppSecrets` fails → surface the error (do **not** fail open and let
  activation through, and do **not** silently render an empty configured list).
- 409 from activate → render the missing slot names inline with a link/scroll to
  the Secrets section, not a generic error toast.
- Values are never echoed back; after save, the UI shows key names only.

## Testing

- **Unit** (`packages/deploy`): `missingRequiredSecrets` — required missing,
  required present, optional missing (no gate), empty/undefined slots,
  case-sensitivity.
- **Unit** (`packages/deploy`): `camelPlatformApp` maps `secrets`, and defaults
  to `[]` when the backend omits it. (This also guards the snake/camel contract
  — a class of bug that recently shipped undetected in `camelOperateAppMetrics`.)
- **Route** (all three copies): activate returns 409 + `missing` when a required
  slot is unfilled; activates normally when filled; unchanged when the app
  declares no slots.
- **Component** (`apps/aomi-build`): Activate disabled with an unfilled required
  slot; enabled after saving it; missing slots render with name + description
  and a masked input.

## Open dependency

Confirm with the backend whether `/api/platforms/:platform/apps` (and
`/apps/:app`) already includes `secrets` in its response. If yes, this ships as
a frontend-only change. If no, it needs one additive field on an existing
response before the gate can work.
