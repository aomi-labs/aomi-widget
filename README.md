AI assistant + onchain widget library and demo landing page for `@aomi-labs/react`.

## Library usage

```bash
pnpm install @aomi-labs/react
```

Drop the frame into your app:

```tsx
import { AomiFrame } from "@aomi-labs/react";

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
pnpm run build:lib            # build the published bundle
pnpm --filter landing dev     # run the landing/demo (http://localhost:3000)
pnpm run dev:landing:live     # watch the library and run the landing together
pnpm lint                     # lint library + example source
```

The landing/demo app lives in `apps/landing/` and imports the built library. Re-run `pnpm run build:lib` after changing code in `src/`.

## Env

Create `.env` with your Web3 Project ID from https://docs.reown.com/ and URL endpoint of your backend:
```
NEXT_PUBLIC_PROJECT_ID=000000000000000000000000
NEXT_PUBLIC_BACKEND_URL=http://example.app.com
```
