"use client";

import { AomiWalletKitProvider } from "../config";
import type { AomiWalletKitProviderInput } from "../config";

export type AomiWalletProviderProps =
  | AomiWalletKitProviderInput
  | (AomiWalletKitProviderInput & {
      /** @deprecated use AomiWalletKitProvider preset/auth config. */
      provider?: "para" | "privy" | "base-account" | (string & {});
    });

/** @deprecated use AomiWalletKitProvider. */
export function AomiWalletProvider(props: AomiWalletProviderProps) {
  const { provider, ...rest } = props as AomiWalletProviderProps & {
    provider?: string;
  };
  if (!provider) return <AomiWalletKitProvider {...rest} />;
  if (provider === "base-account") {
    return (
      <AomiWalletKitProvider
        {...rest}
        auth={false}
        wallets={{ evm: { wallets: ["baseAccount"] }, solana: false }}
      />
    );
  }
  return <AomiWalletKitProvider {...rest} preset={provider as never} />;
}

export { AomiWalletKitProvider };
export type { AomiWalletKitProviderInput };
