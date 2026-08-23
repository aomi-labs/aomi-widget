"use client";

import "@aomi-labs/widget-lib/providers/para";
import "@aomi-labs/widget-lib/providers/privy";

import type { ReactNode } from "react";
import { AomiWalletKitProvider } from "@aomi-labs/widget-lib";
import type { PortalEmbeddedProvider } from "@portal/lib/provider-login/types";

export function PortalEmbeddedProviderRuntime({
  appDescription,
  children,
  provider,
}: {
  appDescription: string;
  children: ReactNode;
  provider: PortalEmbeddedProvider;
}) {
  return (
    <AomiWalletKitProvider
      auth={{
        provider,
        methods: provider === "privy" ? ["google", "email"] : ["google"],
      }}
      providers={{
        para: {
          apiKey: process.env.NEXT_PUBLIC_PARA_API_KEY,
          environment:
            process.env.NEXT_PUBLIC_PARA_ENVIRONMENT === "PROD"
              ? "PROD"
              : "BETA",
          appName: "Aomi Labs",
          appDescription,
        },
        privy: {
          appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
          appName: "Aomi Labs",
        },
      }}
    >
      {children}
    </AomiWalletKitProvider>
  );
}
