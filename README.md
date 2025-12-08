AI assistant + onchain widget library and demo landing page for `@aomi-labs/widget-lib`.

## Library usage

```bash
pnpm install @aomi-labs/widget-lib
```

Drop the frame into your app:

```tsx
import { AomiFrame } from "@aomi-labs/widget-lib";

export function Assistant() {
  return (
    <AomiFrame height="640px" width="100%">
      {/* optional slots like WalletSystemMessenger */}
    </AomiFrame>
  );
}
```

## Develop this repo

```bash
pnpm install
pnpm run build:lib        # build the published bundle
pnpm --filter example dev # run the landing/demo (http://localhost:3000)
pnpm run dev:example:live # watch the library and run the example together
pnpm lint                 # lint library + example source
```

The example app lives in `example/` and imports the built library. Re-run `pnpm run build:lib` after changing code in `src/`.

## Env

Create `.env` with your Web3 Project ID from https://docs.reown.com/ and URL endpoint of your backend:
```
NEXT_PUBLIC_PROJECT_ID=000000000000000000000000
NEXT_PUBLIC_BACKEND_URL=http://example.app.com
```
