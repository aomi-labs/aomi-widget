"use client";

import { AomiFrame } from "@aomi-labs/widget-lib";
import { Preview } from "@/components/playground/Preview";
import ContextProvider from "@/components/wallet-providers";

const widgetCode = `import { AomiFrame } from "@aomi-labs/widget-lib";

export function WidgetDemo() {
  return (
    <AomiFrame.Root height="560px" width="100%" walletPosition="footer">
      <AomiFrame.Header withControl controlBarProps={{ hideNetwork: false }} />
      <AomiFrame.Composer />
    </AomiFrame.Root>
  );
}`;

export function WidgetFrame() {
  return (
    <ContextProvider>
      <AomiFrame.Root height="560px" width="100%" walletPosition="footer">
        <AomiFrame.Header withControl controlBarProps={{ hideNetwork: false }} />
        <AomiFrame.Composer />
      </AomiFrame.Root>
    </ContextProvider>
  );
}

export function WidgetDemo() {
  return (
    <Preview
      title="AomiFrame live demo"
      description="Chat surface, thread list, and composer running with wallet integration in sidebar footer."
      code={widgetCode}
      badge="Live"
    >
      <WidgetFrame />
    </Preview>
  );
}
