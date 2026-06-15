"use client";

import { AomiFrame, AomiWalletKitProvider } from "@aomi-labs/widget-lib";
import { useMemo } from "react";
import { base } from "wagmi/chains";

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
      <AomiWalletKitProvider
        preset="wallets-only"
        execution={{
          aa: "optional",
          sponsorship: resolvedPaymasterServiceUrl
            ? {
                mode: "optional",
                paymasterServiceUrl: resolvedPaymasterServiceUrl,
              }
            : undefined,
        }}
        wallets={{
          evm: {
            chains: [base],
            wallets: ["baseAccount"],
            coinbase: false,
            appName: walletAppName,
          },
          solana: false,
        }}
      >
        <AomiFrame.Root
          width="100%"
          height="100%"
          backendUrl={backendUrl}
          walletPosition="footer"
          className="rounded-none border-0 shadow-none"
        >
          <AomiFrame.Header />
          <AomiFrame.Composer
            withControl
            controlBarProps={{
              hideApiKey: true,
            }}
          />
        </AomiFrame.Root>
      </AomiWalletKitProvider>
    </main>
  );
}
