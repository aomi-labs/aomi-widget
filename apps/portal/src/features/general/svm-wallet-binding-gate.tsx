"use client";

import { useEffect, useState } from "react";
import { isUnboundWalletError } from "@aomi-labs/client";
import { useAomiRuntime } from "@aomi-labs/react";
import { Button } from "@aomi-labs/widget-lib";
import { useSvmWalletBinding } from "./use-svm-wallet-binding";

function eventText(payload: unknown): string {
  if (typeof payload === "string") return payload;
  try {
    return JSON.stringify(payload);
  } catch {
    return "";
  }
}

export function SvmWalletBindingGate() {
  const { subscribe, sendMessage } = useAomiRuntime();
  const { bind, binding, canBind } = useSvmWalletBinding();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const detect = (event: { payload?: unknown }) => {
      if (isUnboundWalletError(eventText(event.payload))) setVisible(true);
    };
    const unsubscribeError = subscribe("system_error", detect);
    const unsubscribeTool = subscribe("tool_complete", detect);
    return () => {
      unsubscribeError();
      unsubscribeTool();
    };
  }, [subscribe]);

  if (!visible) return null;

  return (
    <aside className="bg-background border-border absolute bottom-24 right-4 z-50 w-[min(24rem,calc(100%-2rem))] rounded-xl border p-4 shadow-xl">
      <p className="text-sm font-medium">Bind your Solana wallet to continue</p>
      <p className="text-muted-foreground mt-1 text-sm">
        This one-time signature proves the connected wallet belongs to your Aomi
        account. It does not move funds.
      </p>
      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          disabled={!canBind || binding}
          onClick={() => {
            void bind().then((bound) => {
              if (!bound) return;
              setVisible(false);
              void sendMessage(
                "Retry the previous Solana transaction now that the wallet is bound.",
              );
            });
          }}
        >
          {binding ? "Waiting for signature…" : "Bind wallet and retry"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setVisible(false)}
        >
          Not now
        </Button>
      </div>
    </aside>
  );
}
