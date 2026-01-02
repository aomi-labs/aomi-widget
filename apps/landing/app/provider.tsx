"use client";

import { RootProvider } from "fumadocs-ui/provider/next";
import type { ReactNode } from "react";
import ContextProvider from "@/components/wallet-providers";

export function Provider({ children }: { children: ReactNode }) {
  return (
    <RootProvider>
      <ContextProvider cookies={null}>{children}</ContextProvider>
    </RootProvider>
  );
}
