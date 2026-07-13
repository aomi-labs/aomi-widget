# @aomi-labs/widget-lib

The complete Aomi React widget, plus lower-level UI and wallet-kit components.

## Install

```bash
npm install @aomi-labs/widget-lib
```

## Para

```tsx
import { AomiWidget } from "@aomi-labs/widget-lib";
import { paraAuth } from "@aomi-labs/widget-lib/providers/para";
import "@aomi-labs/widget-lib/styles.css";

export function Assistant() {
  return (
    <AomiWidget
      apiUrl="https://chat.aomi.dev"
      auth={paraAuth({
        apiKey: process.env.NEXT_PUBLIC_PARA_API_KEY,
        environment: "PROD",
      })}
      height="640px"
    />
  );
}
```

## Privy

```tsx
import { AomiWidget } from "@aomi-labs/widget-lib";
import { privyAuth } from "@aomi-labs/widget-lib/providers/privy";
import "@aomi-labs/widget-lib/styles.css";

export function Assistant() {
  return (
    <AomiWidget
      apiUrl="https://chat.aomi.dev"
      auth={privyAuth({ appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID })}
    />
  );
}
```

## External wallet / SIWE

Omit `auth` to keep embedded provider SDKs out of the bundle and use external
wallets with Portal SIWE:

```tsx
import { AomiWidget } from "@aomi-labs/widget-lib";
import "@aomi-labs/widget-lib/styles.css";

export function Assistant() {
  return <AomiWidget apiUrl="https://chat.aomi.dev" />;
}
```

`apiUrl` is the Aomi Portal/BFF origin, not the raw backend. The widget uses
credentialed REST, polling, and SSE transport and aligns its account runtime to
the same origin. Cross-origin consumers must be listed in Portal's
`AOMI_TRUSTED_ORIGINS`; do not mount a second BetterAuth or `/api/aomi/*` route
tree in the consumer.

Portal and the consumer should share a parent site. An unrelated top-level
consumer domain must use a same-site reverse proxy or a customer-domain Portal;
CORS approval by itself does not make third-party session cookies portable
across browsers.

The stylesheet is precompiled. Package consumers do not need Tailwind or an
`@source` rule for widget internals.

For advanced layouts, compose `AomiWalletKitProvider` with the `AomiFrame`
compound API. For source-owned components, use the Aomi shadcn registry:

```bash
npx shadcn add https://aomi.dev/r/aomi-widget.json
```

Full setup, auth environment, Vite notes, and deployment checks are documented
at [aomi.dev/docs/build/quickstart](https://aomi.dev/docs/build/quickstart).
