"use client";

import type { ReactNode } from "react";

export default {};

export const Environment = {
  BETA: "BETA",
  PROD: "PROD",
} as const;

export function ParaProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useAccount(): never {
  throw new Error("Para SDK unavailable in tests");
}

export function useClient() {
  return null;
}

export function useIssueJwt() {
  return { issueJwtAsync: async () => null };
}

export function useLogout() {
  return { logoutAsync: async () => undefined };
}

export function useModal() {
  return { openModal: () => undefined };
}

export type TOAuthMethod =
  | "GOOGLE"
  | "APPLE"
  | "DISCORD"
  | "TWITTER"
  | "FARCASTER"
  | "TELEGRAM";

export type TExternalWallet =
  | "WALLETCONNECT"
  | "METAMASK"
  | "COINBASE"
  | "RAINBOW"
  | "RABBY";
