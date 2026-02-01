"use client";

import { AomiFrame } from "@aomi-labs/widget-lib";
import { Preview } from "@/components/playground/Preview";

const widgetCode = `import { AomiFrame } from "@aomi-labs/widget-lib";

export function WidgetDemo() {
  return (
    <AomiFrame.Root height="560px" width="100%" walletPosition="footer">
      <AomiFrame.Header withControl />
      <AomiFrame.Composer />
    </AomiFrame.Root>
  );
}`;

export function WidgetFrame() {
  return (
    <AomiFrame.Root height="560px" width="100%" walletPosition="footer">
      <AomiFrame.Header withControl />
      <AomiFrame.Composer />
    </AomiFrame.Root>
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
