"use client";

import { AomiFrame } from "@/components/aomi-frame";
import { Preview } from "@landing/components/playground/Preview";
import { WalletFooter } from "@landing/components/wallet-footer";

const widgetCode = `import { AomiFrame } from "@aomi-labs/react";
import { WalletFooter } from "@/components/wallet-footer";

export function WidgetDemo() {
  return (
    <AomiFrame height="560px" width="100%" walletFooter={(props) => <WalletFooter {...props} />} />
  );
}`;

export function WidgetFrame() {
  return (
    <AomiFrame
      height="560px"
      width="100%"
      walletFooter={(props) => <WalletFooter {...props} />}
    />
  );
}

export function WidgetDemo() {
  return (
    <Preview
      title="AomiFrame live demo"
      description="Chat surface, thread list, and composer running with the Reown wallet footer."
      code={widgetCode}
      badge="Live"
    >
      <WidgetFrame />
    </Preview>
  );
}
