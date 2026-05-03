"use client";

import type { ReactNode } from "react";
import {
  AomiBaseAccountProvider,
  type AomiBaseAccountProviderProps,
} from "./base-account";
import { AomiParaProvider, type AomiParaProviderProps } from "./para";

export type AomiWalletProviderProps =
  | ({ provider: "para"; children: ReactNode } & AomiParaProviderProps)
  | ({
      provider: "base-account";
      children: ReactNode;
    } & AomiBaseAccountProviderProps);

export function AomiWalletProvider(props: AomiWalletProviderProps) {
  if (props.provider === "base-account") {
    const { provider: _provider, ...rest } = props;
    return <AomiBaseAccountProvider {...rest} />;
  }

  const { provider: _provider, ...rest } = props;
  return <AomiParaProvider {...rest} />;
}

export { AomiBaseAccountProvider, AomiParaProvider };
export type { AomiBaseAccountProviderProps, AomiParaProviderProps };
