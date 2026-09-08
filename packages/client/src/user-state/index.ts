import * as accessors from "./accessors";
import type { components } from "../generated/agent-v1/types";
import type { AomiAccountProfile, AomiOnchainAddress } from "../types";

/**
 * Client-side user state synced with the backend.
 * Typically wallet connection info, but can be any key-value data.
 *
 * Account-abstraction and sponsorship are backend authority: they are resolved
 * by the `execution-profile` endpoint and per-execution operation payloads, and
 * are deliberately NOT part of this wire shape. The client never sends or stores
 * them here.
 */
type Schemas = components["schemas"];

export type UserState = Schemas["UserState"];
export type UserStateConnection = Schemas["UserStateConnection"];
export type UserStateEvm = Schemas["UserStateEvm"];
export type UserStateSvm = Schemas["UserStateSvm"];

/**
 * Known client surfaces that may want backend-specific UX strategies.
 * Additional string values are allowed for forward compatibility.
 */
export type AomiClientType = "ts_cli" | "web_ui" | (string & {});

export const CLIENT_TYPE_TS_CLI: AomiClientType = "ts_cli";
export const CLIENT_TYPE_WEB_UI: AomiClientType = "web_ui";

export namespace UserState {
  /** Display labels and provider names are not wallet identities. */
  export function sameAddress(
    left: AomiOnchainAddress,
    right: AomiOnchainAddress,
  ): boolean {
    return (
      left.chain === right.chain &&
      (left.chain === "evm"
        ? left.address.toLowerCase() === right.address.toLowerCase()
        : left.address === right.address)
    );
  }

  /** Choose the submitter before assembly, without changing the selected account.
   * Backend authorization and app capability checks remain authoritative.
   */
  export function route(
    state: UserState,
    profile: AomiAccountProfile,
    now = Date.now(),
  ): UserState {
    const next = { ...state };
    for (const chain of ["evm", "svm"] as const) {
      const wallet = state[chain];
      if (!wallet?.address) continue;
      const address = { chain, address: wallet.address };
      const policy = profile.signing_policies.find((row) =>
        sameAddress(row.address, address),
      );
      if (!policy) continue; // Guest/unbound wallets still face the backend gate.
      if (policy.mode === "denied") throw new Error("This wallet is locked.");
      if (policy.mode === "manual" || policy.mode === "client_auto") continue;
      if (policy.mode !== "auto")
        throw new Error("Unsupported signing policy.");
      const owner = profile.user_accounts.find((row) =>
        sameAddress(row.address, address),
      );
      const delegation = profile.delegated_accounts.some(
        (row) =>
          sameAddress(row.address, address) &&
          row.delegation_provider === owner?.auth_provider &&
          row.status === "active" &&
          row.revoked_at === null &&
          (row.expires_at === null || row.expires_at * 1000 > now),
      );
      if (!delegation)
        throw new Error(
          "Auto requires an active delegation for this exact wallet.",
        );
      if (wallet.broadcaster === "wallet")
        throw new Error(
          "Auto cannot use the wallet broadcaster. Select Hosted before preparing a transaction.",
        );
      next[chain] = { ...wallet, broadcaster: wallet.broadcaster ?? "hosted" };
    }
    return next;
  }

  export const address = accessors.address;
  export const evmAddress = accessors.evmAddress;
  export const svmAddress = accessors.svmAddress;
  export const chainId = accessors.chainId;
  export const ensName = accessors.ensName;
  export const isConnected = accessors.isConnected;
  export const provider = accessors.provider;
  export const authMethod = accessors.authMethod;
  export const withExt = accessors.withExt;
}
