"use client";

import type { ReactNode } from "react";
import {
  AomiBaseAccountProvider,
  type AomiBaseAccountProviderProps,
} from "./base-account";
import { AomiParaProvider, type AomiParaProviderProps } from "./para";
import { AomiPrivyProvider, type AomiPrivyProviderProps } from "./privy";

export type AomiWalletProviderProps =
  | ({ provider: "para"; children: ReactNode } & AomiParaProviderProps)
  | ({
      provider: "base-account";
      children: ReactNode;
    } & AomiBaseAccountProviderProps)
  | ({ provider: "privy"; children: ReactNode } & AomiPrivyProviderProps);

export function AomiWalletProvider(props: AomiWalletProviderProps) {
  if (props.provider === "base-account") {
    const { provider: _provider, ...rest } = props;
    return <AomiBaseAccountProvider {...rest} />;
  }

  if (props.provider === "privy") {
    const { provider: _provider, ...rest } = props;
    return <AomiPrivyProvider {...rest} />;
  }

  const { provider: _provider, ...rest } = props;
  return <AomiParaProvider {...rest} />;
}

export { AomiBaseAccountProvider, AomiParaProvider, AomiPrivyProvider };
export type {
  AomiBaseAccountProviderProps,
  AomiParaProviderProps,
  AomiPrivyProviderProps,
};
