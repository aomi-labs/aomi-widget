# Minimal widget consumer

This intentionally plain Vite app proves that the published package works
without Aomi's Next.js aliases, auth routes, backend proxy, or app-specific
provider wrappers.

## Run it

```bash
cp apps/widget-consumer/.env.example apps/widget-consumer/.env.local
./scripts/dev-auth-stack.sh start
pnpm --filter widget-consumer dev
```

Open `http://localhost:3001` for Para and
`http://localhost:3001/providerless.html` for external-wallet/SIWE mode. The
standard local consumer origin is trusted automatically by Portal. If you use a
different Vite port, add its exact origin to Portal's
`AOMI_TRUSTED_ORIGINS`.

## What this verifies

- `src/main.tsx` uses one `AomiWidget` plus the tree-shakeable `paraAuth()`
  helper.
- `src/providerless.tsx` imports no provider subpath and runs without a Para or
  Privy SDK in its bundle graph.
- Both pages point `apiUrl` at Portal on port 3000. They do not call the raw
  backend or mount `/api/auth/*` / `/api/aomi/*` locally.
- The package supplies compiled CSS, so the app has no Tailwind or package
  source-scanning configuration.
- `vite.config.ts` supplies the `buffer` and `os` browser shims required by the
  Para 2.19 browser SDK without injecting mutable Node globals.

`VITE_PARA_API_KEY` is a public provider identifier. It must match Portal's
`PARA_JWT_AUDIENCE`. Provider verification keys, Para REST secrets, BetterAuth
secrets, database URLs, and Portal bearer-signing keys are server-only and do
not belong in this app.

Both local ports are same-site (`localhost`), matching the recommended
production shape of sibling subdomains. If a real consumer lives on an
unrelated top-level domain, use a customer-domain Portal or a same-site reverse
proxy; adding CORS alone is not sufficient for portable session cookies.

## Production build

```bash
pnpm --filter widget-consumer build
```

The build emits separate Para and providerless entry graphs. Inspect
`dist/.vite/manifest.json` when changing package entrypoints or provider
registration to ensure the providerless page stays provider-free.
