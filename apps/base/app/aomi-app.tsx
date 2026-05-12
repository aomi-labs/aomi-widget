"use client";

import { AomiBaseAccountProvider, AomiFrame } from "@aomi-labs/widget-lib";
import { useMemo } from "react";
import { BasePaymentGate } from "./base-payment-gate";

type AomiAppProps = {
  paymasterServiceUrl?: string;
  walletAppName: string;
};

const backendUrl = "/";

function toAbsoluteBrowserUrl(url: string): string {
  if (typeof window === "undefined") return url;
  return new URL(url, window.location.origin).toString();
}

export function AomiApp({ paymasterServiceUrl, walletAppName }: AomiAppProps) {
  const resolvedPaymasterServiceUrl = useMemo(
    () =>
      paymasterServiceUrl
        ? toAbsoluteBrowserUrl(paymasterServiceUrl)
        : undefined,
    [paymasterServiceUrl],
  );

  return (
    <main className="bg-background h-full w-full overflow-hidden">
      <AomiBaseAccountProvider
        appName={walletAppName}
        sponsorship={
          resolvedPaymasterServiceUrl
            ? {
                mode: "required",
                paymasterServiceUrl: resolvedPaymasterServiceUrl,
              }
            : undefined
        }
      >
        <BasePaymentGate walletAppName={walletAppName}>
          {({ clientOptions, paymentUi }) => (
            <AomiFrame.Root
              width="100%"
              height="100%"
              backendUrl={backendUrl}
              walletPosition="footer"
              className="rounded-none border-0 shadow-none"
              clientOptions={clientOptions}
            >
              {paymentUi}
              <AomiFrame.Header />
              <AomiFrame.Composer
                withControl
                controlBarProps={{
                  hideApiKey: true,
                }}
              />
            </AomiFrame.Root>
          )}
        </BasePaymentGate>
      </AomiBaseAccountProvider>
    </main>
  );
}
