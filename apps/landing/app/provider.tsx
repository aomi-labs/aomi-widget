"use client";

import { RootProvider } from "fumadocs-ui/provider/next";
import type { ReactNode } from "react";

/** Docs-only. Keep this off marketing routes (`/`, `/v2`) so webpack does not load fumadocs-ui there. */
export function Provider({ children }: { children: ReactNode }) {
  return <RootProvider>{children}</RootProvider>;
}
