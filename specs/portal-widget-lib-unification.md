# Portal Widget-Lib Unification

## Summary

Replace `apps/portal`'s forked chat/widget stack with direct `@aomi-labs/widget-lib` consumption, keep `/settings` as a slim account/admin surface, and remove the local auth-adapter shim plus other portal-only UI copies. Preserve portal's current wallet-aware `mppx`/`x402` runtime behavior without making that behavior the default for all widget-lib consumers.

## Public API / Shared Interface Changes

- Extend shared `apps/registry/src/components/aomi-frame.tsx` `AomiFrame.Root` props with `clientOptions?: Omit<AomiClientOptions, "baseUrl">`.
- Keep the new prop optional and backward-compatible.
- Do not move portal's `mppx`/`x402`/wagmi payment wrapper into default widget-lib behavior.
  - Shared widget-lib should only accept `clientOptions`.
  - Portal should provide its payment-aware `fetch` through that prop from a thin local wrapper or helper.
  - `landing` and `miniapp` continue using widget-lib without `x402`/`mppx` dependencies or behavior changes.
- Use the existing widget-lib root exports for auth providers and adapter hooks:
  - `AomiWalletProvider`, `AomiParaProvider`, `AomiBaseAccountProvider`, and `useAomiAuthAdapter` come from `@aomi-labs/widget-lib`.
  - `useControl` and `useUser` continue to come from `@aomi-labs/react`, not widget-lib.
- Do not add portal-specific URL/query semantics to widget-lib. Keep `?app=` / `?aomi_app=` handling in portal as a tiny non-UI bootstrap helper.

## Implementation Changes

- Land the refactor in two phases:
  - first, add the backward-compatible shared `clientOptions` prop to widget-lib and verify `landing`/`miniapp` still build unchanged;
  - second, switch `portal` from its forked UI to the shared package and remove dead portal-only files.
- Update `apps/portal` to consume widget-lib the same way `apps/miniapp` does:
  - add `@aomi-labs/widget-lib` to `apps/portal/package.json`,
  - add the same registry-source aliases in `apps/portal/next.config.ts` and `apps/portal/tsconfig.json` for `@aomi-labs/widget-lib`, `@/components`, `@/hooks`, and `@/lib` pointing to `apps/registry/src`,
  - include the package in `transpilePackages`.
- Replace portal's local chat/widget imports with package imports:
  - `Hero` should render `AomiFrame.Root/Header/Composer` from `@aomi-labs/widget-lib`,
  - `WalletProviders` should import wallet providers directly from `@aomi-labs/widget-lib`,
  - any auth adapter hooks should come from widget-lib exports instead of `src/lib/aomi-auth-adapter.ts`,
  - `useControl` / `useUser` usages should import from `@aomi-labs/react`.
- Replace portal's current frame fork with a thin portal-local wrapper around `AomiFrame.Root` only if needed for payment-aware runtime fetch.
  - That wrapper should build the same wallet-aware `fetch` currently implemented in `apps/portal/src/components/aomi-frame.tsx`.
  - If `clientOptions.fetch` is provided, it must take precedence unchanged.
  - If wagmi config or wallet client are unavailable, the wrapper must fall back safely to the default widget-lib runtime behavior.
- Delete portal's duplicated widget stack once references are gone:
  - `src/components/aomi-frame.tsx`,
  - `src/components/assistant-ui/**`,
  - `src/components/control-bar/**`,
  - `src/components/ui/**` that only exist for the forked widget,
  - `src/components/wallet-tx-handler.tsx`,
  - `src/lib/aomi-auth-adapter.ts`.
- Keep portal-only routing behavior as a thin helper:
  - replace `AppSelectUrlSync` with a small bootstrap component mounted inside `AomiFrame.Root` so `useControl()` is in scope,
  - the helper should read `?app=` / `?aomi_app=` once on initial load and call `useControl().onAppSelect(...)`.
  - Do not keep a custom `AppSelect`, `ApiKeyInput`, `ModelSelect`, or `NetworkSelect`.
- Slim `apps/portal/src/app/globals.css`:
  - first, diff portal globals against widget-lib styles and identify which variables/utilities are truly portal-specific,
  - import `@aomi-labs/widget-lib/styles.css`,
  - keep only portal-specific brand/font/page utilities,
  - remove duplicated widget theme tokens, sidebar/theme scaffolding, and other CSS that only exists because portal copied registry UI.
- Keep `/settings`, but narrow it to non-duplicated account/admin flows:
  - keep account overview, usage overview, owned API-key CRUD, and provider-key management;
  - remove duplicated runtime controls such as the separate "App API Key" editor and any local-only theme/preferences surfaces that are no longer part of the product.
- Reuse shared control/runtime state on `/settings`:
  - wire `settings-runtime-provider.tsx` into the settings route,
  - make it provide `ThreadContextProvider`, `UserContextProvider`, and `ControlContextProvider`,
  - sync wallet identity from `useAomiAuthAdapter()` into `useUser()` so settings pages use the same persisted API key, client id, and provider-key conventions as the widget.
- Treat `/` and `/settings` as separate provider trees.
  - Shared behavior across route navigations should come from persisted storage and wallet identity rehydration, not from live React state surviving navigation.
  - Do not assume `currentThreadId`, pending wallet requests, or other ephemeral per-mount runtime state persists between the two routes.
- Remove portal-specific storage/session glue that is now redundant with shared control state:
  - delete `use-api-key.ts`,
  - delete `provider-keys-api.ts`,
  - delete `provider-keys-utils.ts` and its tests,
  - remove the `aomi:apps-updated` event flow.
- Standardize provider-key management on shared client/control APIs:
  - `/settings` provider-key UI should use `AomiClient.listProviderKeys/saveProviderKey/deleteProviderKey` or the corresponding shared control-context helpers,
  - stop using `/api/settings/provider-keys`,
  - remove the portal-only provider-key storage normalization path once the shared path is wired.
- Keep `settings-api.ts` only for backend endpoints that are truly settings/account-only and not already covered by `AomiClient` or `useControl`.

## Test Plan

- Static checks:
  - `pnpm --filter portal lint`
  - `pnpm --filter portal type-check`
  - `pnpm run build:lib`
  - `pnpm --filter portal build`
  - `pnpm --filter landing build`
  - `pnpm --filter miniapp build`
- Manual portal smoke tests:
  - `/` renders the shared widget frame with thread list, header, composer, wallet connect, app/model/network/API-key controls.
  - Wallet connect/disconnect, chain switching, and pending wallet request handling still work.
  - A paid request path still uses the preserved portal-local `mppx`/`x402` wallet-aware fetch behavior.
  - `?app=` and `?aomi_app=` still preselect the requested app on first load.
  - API key entered in the widget control bar persists and affects authorized apps without the old `aomi:apps-updated` event path.
  - `/settings` loads account overview, usage, owned API keys, and provider keys using the same wallet identity and stored control state as the main widget.
- Regression checks outside portal:
  - `apps/landing` and `apps/miniapp` still render the shared frame unchanged, since the new `clientOptions` prop is optional and payment wiring remains portal-local.

## Assumptions And Defaults

- Portal remains on the Para-based wallet flow; no wallet-provider product change is part of this refactor.
- `/settings` is retained only as an account/admin surface, not as a second runtime-control surface.
- Query-param app preselection remains a portal concern, not a shared widget-lib API.
- Widget-lib should stay lightweight for consumers that do not need portal's payment-aware transport.
- If old portal theme/preferences settings are not surfaced in current product requirements, they should be removed instead of preserved.
