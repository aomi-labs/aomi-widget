"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
import { AomiFrame } from "@aomi-labs/widget-lib";
import { useControl } from "@aomi-labs/react";
import { usePaymentAwareClientOptions } from "@portal/lib/payment-client-options";
import { usePaymentSelectProps } from "@portal/lib/use-payment-select-props";

function getRequestedAppFromSearch(search: string): string | null {
  const params = new URLSearchParams(search);

  for (const key of ["aomi_app", "app"] as const) {
    const value = params.get(key)?.trim();
    if (value) {
      return value;
    }
  }

  return null;
}

function AppSelectUrlBootstrap() {
  const { onAppSelect } = useControl();
  const hasAppliedRequestedAppRef = useRef(false);

  useEffect(() => {
    if (hasAppliedRequestedAppRef.current) {
      return;
    }

    const requestedApp = getRequestedAppFromSearch(window.location.search);
    if (!requestedApp) {
      return;
    }

    onAppSelect(requestedApp);
    hasAppliedRequestedAppRef.current = true;
  }, [onAppSelect]);

  return null;
}

export function PortalAomiFrame() {
  const clientOptions = usePaymentAwareClientOptions();
  const paymentSelectProps = usePaymentSelectProps();

  return (
    <main className="bg-background h-full w-full overflow-hidden">
      <AomiFrame.Root
        width="100%"
        height="100%"
        walletPosition="footer"
        className="rounded-none border-0 shadow-none"
        clientOptions={clientOptions}
      >
        <AppSelectUrlBootstrap />
        <AomiFrame.Header>
          <Link
            href="/settings"
            className="inline-flex items-center justify-center rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Open settings"
          >
            <Settings className="size-4" />
          </Link>
        </AomiFrame.Header>
        <AomiFrame.Composer
          withControl
          controlBarProps={{
            hideApiKey: true,
            paymentSelectProps,
          }}
        />
      </AomiFrame.Root>
    </main>
  );
}
