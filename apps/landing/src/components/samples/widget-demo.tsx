"use client";

import dynamic from "next/dynamic";
import { Preview } from "@/components/playground/Preview";
import { WalletFooter } from "@/components/wallet-footer";

const widgetCode = `import { AomiFrame } from "@aomi-labs/widget-lib/components/aomi-frame";
import { WalletFooter } from "@/components/wallet-footer";

export function WidgetDemo() {
  return (
    <AomiFrame height="560px" walletFooter={WalletFooter} />
  );
}`;

export function WidgetDemo() {
  const ClientFrame = dynamic(
    () => import("@aomi-labs/widget-lib/components/aomi-frame").then((m) => m.AomiFrame),
    { ssr: false },
  );

  return (
    <Preview
      title="AomiFrame live demo"
      description="Chat surface, thread list, and composer running with the Reown wallet footer."
      code={widgetCode}
      badge="Live"
    >
      <ClientFrame height="560px" walletFooter={WalletFooter} />
    </Preview>
  );
}
