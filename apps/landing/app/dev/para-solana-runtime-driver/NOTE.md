# Para Solana Runtime Driver

This page is a frontend-only test harness for the Solana wallet flow through
the real Para adapter.

Route:

- `http://127.0.0.1:3003/dev/para-solana-runtime-driver`

What it tests:

- `LandingParaProvider`
- real `AomiParaProvider` Solana adapter wiring
- local Solana request injection into `RuntimeTxHandler`
- real wallet connect / approve UX through Para

What it does not need:

- backend-emitted Solana events

## Setup

Required env:

- `NEXT_PUBLIC_PARA_API_KEY`
- optional: `NEXT_PUBLIC_PARA_ENVIRONMENT`
- optional: `NEXT_PUBLIC_SOLANA_RPC_URL`

Start landing on port 3003:

```bash
pnpm --filter @aomi-labs/client build
pnpm --filter @aomi-labs/react build
pnpm --filter landing exec next dev --hostname 0.0.0.0 --port 3003
```

## How To Use

1. Open the route above.
2. Click `Connect with Para`.
3. Complete Para auth.
4. In Para account UI, attach a Solana-capable wallet such as Phantom.
5. Wait until the page shows:
   - `Connected: true`
   - a real `Solana address`
   - a wallet name such as `Phantom`
6. Click `Run solana_sign`.
7. Approve the wallet popup.

Success means the page records a `solana_sign` result in `Last Result`.

## Common Failure Modes

`Connected: true` but `Solana address: not connected`

- Para auth succeeded, but no Solana wallet is attached yet.
- Open `Manage Para account` and connect Phantom or another Solana wallet.

Phantom connect modal spins forever

- the extension popup is still waiting for approval, blocked, or stuck
- close the modal, reload the page, and reconnect
- no Solana signing can happen until `Solana address` is populated

`Run solana_sign` disabled

- the page still does not see a Solana-capable signer

`send_direct` / `send via sign+broadcast` fails

- the connected Solana account likely has no devnet SOL
- `sign only` is the cheapest validation path because it does not need funds

## Related Files

- `apps/landing/components/dev/para-solana-runtime-driver.tsx`
- `apps/landing/app/dev/para-solana-runtime-driver/page.tsx`
- `apps/landing/app/api/dev/solana-runtime-driver/route.ts`
- `scripts/run-para-solana-runtime-driver.mjs`

## Helper Script

You can launch the page and wait for the run report with:

```bash
node scripts/run-para-solana-runtime-driver.mjs --mode=sign
```

It opens the driver page and waits for the browser-side report. The user still
has to complete the Para + wallet popup manually.
