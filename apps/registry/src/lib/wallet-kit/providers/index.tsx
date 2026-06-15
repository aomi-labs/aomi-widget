"use client";

import { AomiWalletKitProvider } from "../config";
import type { AomiWalletKitProviderInput } from "../config";

export type AomiWalletProviderProps =
  | AomiWalletKitProviderInput
  | (AomiWalletKitProviderInput & {
      /** @deprecated use AomiWalletKitProvider preset/auth config. */
      provider?: "para" | "privy" | (string & {});
    });

/** @deprecated use AomiWalletKitProvider. */
export function AomiWalletProvider(props: AomiWalletProviderProps) {
  const { provider, ...rest } = props as AomiWalletProviderProps & {
    provider?: string;
  };
  if (!provider) return <AomiWalletKitProvider {...rest} />;
  return <AomiWalletKitProvider {...rest} preset={provider as never} />;
}

export { AomiWalletKitProvider };
export type { AomiWalletKitProviderInput };
